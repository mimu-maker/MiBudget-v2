import { useState, useMemo, useCallback } from 'react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { supabase } from '@/integrations/supabase/client';
import { APP_STATUSES } from '@/hooks/useSettings';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseAmount } from '@/lib/importUtils';
import { getLocalTransactions, saveLocalTransactions, clearLocalTransactions } from '@/lib/localDb';
import { format, parseISO, startOfMonth } from 'date-fns';

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  source: string;
  amount: number;
  account: string;
  status: string;
  budget: string;
  category: string | null;
  sub_category: string | null;
  planned: boolean;
  recurring: string;
  description: string | null;
  budget_year?: number;
  clean_source?: string;
  budget_month?: string;
  suggested_category?: string;
  suggested_sub_category?: string;
  source_description?: string;
  excluded?: boolean;
  fingerprint?: string;
  confidence?: number;
  projection_id?: string;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
  entity?: string | null;
  is_resolved?: boolean;
  is_split?: boolean;
  parent_id?: string | null;
}

const generateFingerprint = (t: any) => {
  const account = t.account || 'Unknown';
  const str = `${t.date}-${t.source}-${t.amount}-${account}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

const parseBool = (val: any) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    if (lower === 'true' || lower === 'yes' || lower === '1') return true;
    return false;
  }
  return !!val;
};

/**
 * Hook for fetching ALL transactions (Legacy/Analytics use case)
 */
export const useAllTransactions = (options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['transactions-all'],
    queryFn: async () => {
      console.log("Fetching all transactions...");

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || 'a316d106-5bc5-447a-b594-91dab8814c06';

      let localData = await getLocalTransactions();

      // Migration logic from localStorage...
      const storedLegacy = localStorage.getItem('mibudget_transactions');
      if (storedLegacy) {
        try {
          const legacyData = JSON.parse(storedLegacy);
          if (legacyData.length > 0) {
            console.log(`Migrating ${legacyData.length} records...`);
            await saveLocalTransactions(legacyData);
            localStorage.removeItem('mibudget_transactions');
            localData = await getLocalTransactions();
          }
        } catch (e) { console.error("Legacy migration failed:", e); }
      }

      if (localData.length > 0) {
        try {
          const toInsert = localData.map(t => ({
            ...t,
            id: (t.id && t.id.includes('-')) ? t.id : crypto.randomUUID(),
            user_id: userId,
            account: t.account || 'Unknown',
            fingerprint: generateFingerprint(t)
          }));

          const CHUNK_SIZE = 500;
          for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
            const chunk = toInsert.slice(i, i + CHUNK_SIZE);
            const dbChunk = chunk.map(idx => {
              const { source, clean_source, source_description, suggested_category, suggested_sub_category, clean_merchant, merchant_description, ...rest } = idx;
              return {
                ...rest,
                merchant: source,
                clean_merchant: clean_source || clean_merchant,
                merchant_description: source_description || merchant_description
              };
            });
            const uniqueDbChunk = Array.from(new Map(dbChunk.map(item => [item.fingerprint, item])).values());
            const { error } = await supabase.from('transactions').upsert(uniqueDbChunk as any, { onConflict: 'fingerprint' });
            if (error) throw error;
          }
          await clearLocalTransactions();
          localData = [];
        } catch (e: any) {
          console.warn("Cloud sync deferred / failed:", e.message);
        }
      }

      try {
        let allTransactions: any[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await (supabase as any)
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .range(from, from + batchSize - 1);

          if (error) throw error;
          if (data) {
            allTransactions = [...allTransactions, ...data];
            if (data.length < batchSize) hasMore = false;
            else from += batchSize;
          } else hasMore = false;
        }

        return allTransactions.map((t: any) => {
          const sourceName = t.source || t.merchant || 'Unknown';
          const cleanSourceName = t.clean_source || t.clean_merchant || null;
          const sourceDesc = t.source_description || t.merchant_description || null;
          let budget_month = t.budget_month;
          let budget_year = t.budget_year;
          if (!budget_month || !budget_year) {
            const d = parseISO(t.date);
            if (!isNaN(d.getTime())) {
              budget_month = budget_month || format(startOfMonth(d), 'yyyy-MM-01');
              budget_year = budget_year || d.getFullYear();
            }
          }
          return {
            ...t,
            source: sourceName,
            clean_source: cleanSourceName,
            source_description: sourceDesc,
            budget_month,
            budget_year,
            subCategory: t.sub_category || '',
            parent_id: t.parent_id
          };
        }) as Transaction[];
      } catch (e: any) {
        console.warn("Returning local set as fallback:", e.message);
        return localData;
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 60 * 24, // Keep 24h
    gcTime: 1000 * 60 * 60 * 24, // Keep 24h
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for INFINITE transactions with server-side sorting/filtering
 */
const useInfiniteTransactions = (sortBy: keyof Transaction, sortOrder: 'asc' | 'desc', filters: Record<string, any>, options?: { enabled?: boolean }) => {
  return useInfiniteQuery({
    queryKey: ['transactions-infinite', sortBy, sortOrder, filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || 'a316d106-5bc5-447a-b594-91dab8814c06';
      const pageSize = 50;
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;

      let query = (supabase as any)
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      // Apply Filters
      Object.entries(filters).forEach(([field, filterValue]) => {
        if (filterValue === undefined || filterValue === null || filterValue === '' || filterValue === 'all') return;
        if (Array.isArray(filterValue) && filterValue.length === 0) return;

        // Map field names if they differ from DB columns
        let dbField = field;
        if (field === 'source') dbField = 'merchant';

        // Custom Status Filter for Pending Reconciliation + Entity
        if (field === 'status' && Array.isArray(filterValue)) {
          const hasPendingRecon = filterValue.includes('Pending Reconciliation');
          if (hasPendingRecon) {
            const safeValues = filterValue.map(v => `"${v}"`).join(',');
            query = query.or(`status.in.(${safeValues}),status.ilike.Pending %`);
            return;
          }
        }

        if (field === 'date' && filterValue.type) {
          if (filterValue.type === 'range' && filterValue.value?.from) {
            query = query.gte('date', new Date(filterValue.value.from).toISOString());
            if (filterValue.value.to) {
              query = query.lte('date', new Date(filterValue.value.to).toISOString());
            }
          } else if (filterValue.type === 'year') {
            query = query.gte('date', `${filterValue.value}-01-01`).lte('date', `${filterValue.value}-12-31`);
          } else if (filterValue.type === 'month') {
            // Month filter is trickier server-side without raw SQL, for now let's use current year
            const year = new Date().getFullYear();
            const month = String(filterValue.value).padStart(2, '0');
            query = query.gte('date', `${year}-${month}-01`).lte('date', `${year}-${month}-31`);
          }
        } else if (field === 'amount' && filterValue.type === 'number') {
          const val = parseFloat(filterValue.value);
          if (!isNaN(val)) {
            switch (filterValue.operator) {
              case '=': query = query.eq('amount', val); break;
              case '!=': query = query.neq('amount', val); break;
              case '>': query = query.gt('amount', val); break;
              case '>=': query = query.gte('amount', val); break;
              case '<': query = query.lt('amount', val); break;
              case '<=': query = query.lte('amount', val); break;
            }
          }
        } else if (Array.isArray(filterValue)) {
          query = query.in(dbField, filterValue);
        } else if (field === 'resolution') {
          if (filterValue === 'unresolved') {
            query = query.neq('status', 'Complete');
            // clean_source check is hard without local join, ignoring for now as status is primary resolved indicator
          } else if (filterValue === 'resolved') {
            query = query.eq('status', 'Complete');
          }
        } else if (typeof filterValue === 'string') {
          query = query.ilike(dbField, `%${filterValue}%`);
        } else if (typeof filterValue === 'boolean') {
          query = query.eq(dbField, filterValue);
        }
      });

      // Default: Hide Excluded if no status filter
      if (!filters.status || (Array.isArray(filters.status) && filters.status.length === 0)) {
        query = query.neq('status', 'Excluded');
      }

      // Apply Sorting
      let dbSortField = sortBy as string;
      if (sortBy === 'source') dbSortField = 'merchant';
      query = query.order(dbSortField, { ascending: sortOrder === 'asc' });

      // Apply Range
      const { data, error } = await query.range(from, to);

      if (error) throw error;

      return (data || []).map((t: any) => {
        const sourceName = t.source || t.merchant || 'Unknown';
        const cleanSourceName = t.clean_source || t.clean_merchant || null;
        const sourceDesc = t.source_description || t.merchant_description || null;
        return {
          ...t,
          source: sourceName,
          clean_source: cleanSourceName,
          source_description: sourceDesc,
          subCategory: t.sub_category || '',
          parent_id: t.parent_id
        };
      }) as Transaction[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 50 ? allPages.length : undefined;
    },
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
  });
};

const useTransactions = () => useAllTransactions(); // Keep for backward compatibility internally if needed


const useTransactionCounts = (filters: Record<string, any>) => {
  return useQuery({
    queryKey: ['transactions-counts', filters],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || 'a316d106-5bc5-447a-b594-91dab8814c06';

      // 1. Total Count (non-excluded)
      const { count: totalCount, error: totalError } = await (supabase as any)
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'Excluded');

      if (totalError) throw totalError;

      // 2. Filtered Count
      let filteredQuery = (supabase as any)
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Apply Filters (matching useInfiniteTransactions logic)
      Object.entries(filters).forEach(([field, filterValue]) => {
        if (filterValue === undefined || filterValue === null || filterValue === '' || filterValue === 'all') return;
        if (Array.isArray(filterValue) && filterValue.length === 0) return;

        let dbField = field;
        if (field === 'source') dbField = 'merchant';

        // Custom Status Filter for Pending Reconciliation + Entity
        if (field === 'status' && Array.isArray(filterValue)) {
          const hasPendingRecon = filterValue.includes('Pending Reconciliation');
          if (hasPendingRecon) {
            const safeValues = filterValue.map(v => `"${v}"`).join(',');
            filteredQuery = filteredQuery.or(`status.in.(${safeValues}),status.ilike.Pending %`);
            return;
          }
        }

        if (field === 'date' && filterValue.type) {
          if (filterValue.type === 'range' && filterValue.value?.from) {
            filteredQuery = filteredQuery.gte('date', new Date(filterValue.value.from).toISOString());
            if (filterValue.value.to) {
              filteredQuery = filteredQuery.lte('date', new Date(filterValue.value.to).toISOString());
            }
          } else if (filterValue.type === 'year') {
            filteredQuery = filteredQuery.gte('date', `${filterValue.value}-01-01`).lte('date', `${filterValue.value}-12-31`);
          } else if (filterValue.type === 'month') {
            const year = new Date().getFullYear();
            const month = String(filterValue.value).padStart(2, '0');
            filteredQuery = filteredQuery.gte('date', `${year}-${month}-01`).lte('date', `${year}-${month}-31`);
          }
        } else if (field === 'amount' && filterValue.type === 'number') {
          const val = parseFloat(filterValue.value);
          if (!isNaN(val)) {
            switch (filterValue.operator) {
              case '=': filteredQuery = filteredQuery.eq('amount', val); break;
              case '!=': filteredQuery = filteredQuery.neq('amount', val); break;
              case '>': filteredQuery = filteredQuery.gt('amount', val); break;
              case '>=': filteredQuery = filteredQuery.gte('amount', val); break;
              case '<': filteredQuery = filteredQuery.lt('amount', val); break;
              case '<=': filteredQuery = filteredQuery.lte('amount', val); break;
            }
          }
        } else if (Array.isArray(filterValue)) {
          filteredQuery = filteredQuery.in(dbField, filterValue);
        } else if (field === 'resolution') {
          if (filterValue === 'unresolved') {
            filteredQuery = filteredQuery.neq('status', 'Complete');
          } else if (filterValue === 'resolved') {
            filteredQuery = filteredQuery.eq('status', 'Complete');
          }
        } else if (typeof filterValue === 'string') {
          filteredQuery = filteredQuery.ilike(dbField, `%${filterValue}%`);
        } else if (typeof filterValue === 'boolean') {
          filteredQuery = filteredQuery.eq(dbField, filterValue);
        }
      });

      // Default: Hide Excluded if no status filter
      if (!filters.status || (Array.isArray(filters.status) && filters.status.length === 0)) {
        filteredQuery = filteredQuery.neq('status', 'Excluded');
      }

      const { count: filteredCount, error: filteredError } = await filteredQuery;

      if (filteredError) throw filteredError;

      // 3. Filtered Sum (using a separate query to get all amounts for summation)
      // We don't use RPC here to avoid database-side changes, and we select ONLY the amount column to keep it light.
      const { data: sumData, error: sumError } = await filteredQuery.select('amount');

      if (sumError) throw sumError;

      const filteredSum = (sumData || []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

      return {
        total: totalCount || 0,
        filtered: filteredCount || 0,
        filteredSum
      };
    },
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
  });
};

export const useTransactionTable = (options: { mode?: 'infinite' | 'all' } = { mode: 'infinite' }) => {
  const queryClient = useQueryClient();
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});

  const { data: projections = [] } = useQuery({
    queryKey: ['projections-list'],
    queryFn: async () => {
      // Use query with fallback to handle potential column naming differences
      const { data, error } = await supabase
        .from('projections' as any)
        .select('*'); // Select all to avoid column naming issues (source vs merchant)

      if (error) {
        console.warn("Projections fetch failed:", error.message);
        return [];
      }
      return data || [];
    },
    staleTime: 1000 * 60 * 60 * 24, // Keep 24h
    gcTime: 1000 * 60 * 60 * 24 // Keep 24h
  });

  const { data: sourceRules = [] } = useQuery({
    queryKey: ['source-rules-simple'],
    queryFn: async () => {
      // Fetch from both tables in parallel to ensure we get all rules (new + legacy)
      const [sourceRes, merchantRes] = await Promise.allSettled([
        (supabase as any).from('source_rules').select('clean_source_name'),
        (supabase as any).from('merchant_rules').select('clean_merchant_name')
      ]);

      const rules = new Map<string, any>();

      // 1. New Rules (Primary)
      if (sourceRes.status === 'fulfilled' && sourceRes.value.data) {
        sourceRes.value.data.forEach((r: any) => {
          if (r.clean_source_name) {
            rules.set(r.clean_source_name, { clean_source_name: r.clean_source_name });
          }
        });
      }

      // 2. Legacy Rules (Fallback)
      if (merchantRes.status === 'fulfilled' && merchantRes.value.data) {
        merchantRes.value.data.forEach((r: any) => {
          if (r.clean_merchant_name && !rules.has(r.clean_merchant_name)) {
            rules.set(r.clean_merchant_name, { clean_source_name: r.clean_merchant_name });
          }
        });
      }

      return Array.from(rules.values());
    },
    staleTime: 1000 * 60 * 60 * 24, // Keep 24h
    gcTime: 1000 * 60 * 60 * 24 // Keep 24h
  });

  const knownSources = useMemo(() =>
    new Set(sourceRules.map((r: any) => r.clean_source_name).filter(Boolean)),
    [sourceRules]);

  const [sortBy, setSortBy] = usePersistentState<keyof Transaction>('mimu_tx_sortBy', 'date');
  const [sortOrder, setSortOrder] = usePersistentState<'asc' | 'desc'>('mimu_tx_sortOrder', 'desc');
  const [filters, setFilters] = usePersistentState<Record<string, any>>('mimu_tx_filters', {});

  // Infinite Query (Default)
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isInfiniteLoading,
    isError: isInfiniteError
  } = useInfiniteTransactions(sortBy, sortOrder, filters, { enabled: options.mode === 'infinite' });

  // All Query (Optional Mode)
  const {
    data: allData,
    isLoading: isAllLoading,
    isError: isAllError
  } = useAllTransactions({ enabled: options.mode === 'all' });

  const { data: counts } = useTransactionCounts(filters);
  const totalCount = counts?.total || 0;
  const filteredCount = counts?.filtered || 0;

  const transactions = useMemo(() => {
    let raw: Transaction[] = [];
    if (options.mode === 'all') {
      raw = allData || [];
    } else {
      raw = infiniteData?.pages.flat() || [];
    }

    return raw.map(t => ({
      ...t,
      is_resolved: !!(t.clean_source && knownSources.has(t.clean_source))
    }));
  }, [infiniteData, allData, knownSources, options.mode]);

  const isLoading = options.mode === 'all' ? isAllLoading : isInfiniteLoading;
  const isError = options.mode === 'all' ? isAllError : isInfiniteError;

  const [editingCell, setEditingCell] = useState<{ id: string, field: keyof Transaction } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string, field: keyof Transaction, value: any }) => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      // Compatibility mapping for the database
      // Prioritize new schema fields
      const dbField = field;

      let updates: any = { [dbField]: value };

      // Ensure both new and old fields are populated for compatibility
      if (field === 'source') {
        updates.source = value;
        updates.merchant = value;
      }
      if (field === 'clean_source') {
        updates.clean_source = value;
        updates.clean_merchant = value;
      }
      if (field === 'source_description') {
        updates.source_description = value;
        updates.merchant_description = value;
      }

      // Shadow logic & Self-healing
      if (field === 'date') {
        const previousAll = queryClient.getQueryData<Transaction[]>(['transactions-all']);
        const oldTx = previousAll?.find(t => t.id === id);

        if (oldTx) {
          const oldDate = parseISO(oldTx.date);
          const newDate = parseISO(value);

          if (!isNaN(oldDate.getTime()) && !isNaN(newDate.getTime())) {
            const expectedOldMonth = format(startOfMonth(oldDate), 'yyyy-MM-01');

            // If budget_month was linked (same as old date), update it
            if (!oldTx.budget_month || oldTx.budget_month === expectedOldMonth) {
              updates.budget_month = format(startOfMonth(newDate), 'yyyy-MM-01');
              updates.budget_year = newDate.getFullYear();
            }
          }
        }
      }

      if (field === 'status' && value === 'Reconciled') {
        updates.excluded = true;
        updates.budget = 'Exclude';
      }

      let { error } = await (supabase as any)
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        console.warn("Update failed with schema mismatch, retrying with legacy fields...");
        // Fallback: Remove new fields if they don't exist
        const { source, clean_source, source_description, ...safeUpdates } = updates;
        // Ensure legacy fields are set if we stripped source fields
        if (updates.source) safeUpdates.merchant = updates.source;
        if (updates.clean_source) safeUpdates.clean_merchant = updates.clean_source;
        if (updates.source_description) safeUpdates.merchant_description = updates.source_description;

        const { error: retryError } = await (supabase as any)
          .from('transactions')
          .update(safeUpdates)
          .eq('id', id)
          .eq('user_id', userId);
        error = retryError;
      }

      if (error) throw error;
      return { id };
    },
    onMutate: async ({ id, field, value }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions-infinite'] });
      await queryClient.cancelQueries({ queryKey: ['transactions-all'] });

      const previousTotalAll = queryClient.getQueryData<Transaction[]>(['transactions-all']);
      const previousTx = previousTotalAll?.find(t => t.id === id);

      if (previousTotalAll) {
        queryClient.setQueryData(['transactions-all'], (old: Transaction[] | undefined) => {
          if (!old) return [];
          return old.map(t => t.id === id ? { ...t, [field]: value } : t);
        });
      }

      queryClient.setQueriesData({ queryKey: ['transactions-infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: Transaction[]) =>
            page.map(t => t.id === id ? { ...t, [field]: value } : t)
          )
        };
      });

      return { previousTx, previousTotalAll };
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
    },
    onError: (err, variables, context) => {
      if (context?.previousTotalAll) {
        queryClient.setQueryData(['transactions-all'], context.previousTotalAll);
      }
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
    },
  });

  // Consolidated everything into bulkUpdateMutation below

  const addTransactionMutation = useMutation({
    mutationFn: async (newTransaction: Omit<Transaction, 'id'>) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const dateObj = parseISO(newTransaction.date);
      const budgetMonth = newTransaction.budget_month || (isNaN(dateObj.getTime()) ? null : format(startOfMonth(dateObj), 'yyyy-MM-01'));
      const budgetYear = newTransaction.budget_year || (isNaN(dateObj.getTime()) ? null : dateObj.getFullYear());

      const transaction = {
        ...newTransaction,
        budget_month: budgetMonth,
        budget_year: budgetYear,
        fingerprint: generateFingerprint(newTransaction),
        user_id: userId,
        id: crypto.randomUUID()
      };

      // Compatibility mapping for DB insert
      const { source, clean_source, source_description, ...rest } = transaction;
      const dbTransaction = {
        ...rest,
        merchant: source,
        clean_merchant: clean_source,
        merchant_description: source_description
      };

      const { error } = await (supabase as any).from('transactions').insert([dbTransaction]);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
    },
  });

  const handleSort = useCallback((field: keyof Transaction) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy]);


  const handleFilter = useCallback((field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const clearFilter = useCallback((field: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const handleCellEdit = useCallback((id: string, field: keyof Transaction, value: any) => {
    setSavingMap(prev => ({ ...prev, [id]: true }));
    updateTransactionMutation.mutate({ id, field, value }, {
      onSettled: () => {
        setSavingMap(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });
    setEditingCell(null);
  }, []);

  const handleBulkCellEdit = useCallback((id: string, updates: Partial<Transaction>) => {
    setSavingMap(prev => ({ ...prev, [id]: true }));
    bulkUpdateMutation.mutate({ ids: [id], updates }, {
      onSettled: () => {
        setSavingMap(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });
    setEditingCell(null);
  }, []);

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // Chunk deletes to avoid "Request URI too long" or payload limits
      const CHUNK_SIZE = 100;
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { error } = await (supabase as any)
          .from('transactions')
          .delete()
          .in('id', chunk)
          .eq('user_id', userId);

        if (error) {
          console.error(`Validating chunk ${i} failed:`, error);
          throw error;
        }
      }
    },
    onSuccess: (_, variables) => {
      const previousTotalAll = queryClient.getQueryData<Transaction[]>(['transactions-all']);
      const deletedTxs = previousTotalAll?.filter(t => variables.includes(t.id)) || [];

      queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
      setSelectedIds(new Set());
    },
  });

  const handleImport = async (importedTransactions: any[], onProgress?: (current: number, total: number) => void) => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id || 'a316d106-5bc5-447a-b594-91dab8814c06';

    const toInsert = importedTransactions.map((t) => {
      let status = t.status || 'Pending Triage';
      if (!APP_STATUSES.includes(status)) status = 'Pending Triage';

      return {
        ...t,
        id: (t.id && t.id.includes('-')) ? t.id : crypto.randomUUID(),
        user_id: userId,
        source: t.source || 'Unknown',
        merchant: t.source || 'Unknown', // Compatibility
        amount: parseAmount(t.amount.toString()) || 0,
        account: t.account || 'Unknown',
        status: status,
        planned: parseBool(t.planned),
        recurring: t.recurring || 'N/A',
        confidence: t.confidence || 0,
        fingerprint: generateFingerprint(t)
      };
    });

    try {
      // Chunked upload directly to Supabase
      const CHUNK_SIZE = 500;
      const total = toInsert.length;
      let processed = 0;

      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);

        // Sanitize for DB: Use legacy column names for compatibility (source -> merchant)
        // Note: although types.ts may show 'source', the actual DB project uses 'merchant'
        const dbChunk = chunk.map((tx) => {
          // Mandatory user_id check
          const userId = tx.user_id || 'a316d106-5bc5-447a-b594-91dab8814c06'; // Fallback if missing

          const sanitized: any = {
            id: tx.id || crypto.randomUUID(),
            user_id: userId,
            date: tx.date,
            merchant: tx.source || tx.merchant || 'Unknown', // DB expects 'merchant'
            amount: Number(tx.amount) || 0,
            category: tx.category || 'Uncategorized',
            sub_category: tx.sub_category || null,
            status: tx.status || 'Pending Triage',
            account: tx.account || 'Imported',
            budget: tx.budget || 'Default', // Mandatory
            planned: tx.planned ?? true,
            excluded: tx.excluded ?? false,
            merchant_description: tx.notes || tx.description || tx.source_description || null,
            fingerprint: tx.fingerprint,
            clean_merchant: tx.clean_source || tx.clean_merchant || null,
            budget_month: tx.budget_month || null,
            confidence: tx.confidence || 0,
            suggested_category: tx.suggested_category || null,
            suggested_sub_category: tx.suggested_sub_category || null,
          };

          // Handle recurring as boolean
          if (typeof tx.recurring === 'string') {
            sanitized.recurring = !['n/a', 'no', 'false', 'monthly', ''].includes(tx.recurring.toLowerCase());
          } else {
            sanitized.recurring = !!tx.recurring;
          }

          return sanitized;
        });

        const { error } = await supabase.from('transactions').upsert(dbChunk, { onConflict: 'fingerprint' });
        if (error) throw error;

        processed += chunk.length;
        if (onProgress) onProgress(processed, total);
      }

      await queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions-all'] });

    } catch (err: any) {
      console.error("Import failed:", err);
      // Optional: Show error toast/alert to user
      throw err; // Re-throw so UI can handle it if needed
    }
  };

  const handleAddTransaction = async (newTransaction: Transaction) => {
    const { id, ...transactionData } = newTransaction;
    await addTransactionMutation.mutateAsync(transactionData);
  };

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[], updates: Partial<Transaction> }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // Compatibility mapping for the database
      let dbUpdates: any = { ...updates };
      // Ensure specific fields map to both new and old columns
      if ('source' in updates) {
        dbUpdates.source = updates.source;
        dbUpdates.merchant = updates.source;
      }
      if ('clean_source' in updates) {
        dbUpdates.clean_source = updates.clean_source;
        dbUpdates.clean_merchant = updates.clean_source;
      }
      if ('source_description' in updates) {
        dbUpdates.source_description = updates.source_description;
        dbUpdates.merchant_description = updates.source_description;
      }

      if (updates.status === 'Reconciled') {
        dbUpdates.excluded = true;
        dbUpdates.budget = 'Exclude';
      }
      let { error } = await (supabase as any)
        .from('transactions')
        .update(dbUpdates)
        .in('id', ids)
        .eq('user_id', userId);

      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        const { source, clean_source, source_description, ...safeUpdates } = dbUpdates;
        // Ensure legacy fields are set if we stripped source fields
        if (updates.source) safeUpdates.merchant = updates.source;
        if (updates.clean_source) safeUpdates.clean_merchant = updates.clean_source;
        if (updates.source_description) safeUpdates.merchant_description = updates.source_description;

        const { error: retryError } = await (supabase as any)
          .from('transactions')
          .update(safeUpdates)
          .in('id', ids)
          .eq('user_id', userId);
        error = retryError;
      }

      if (error) throw error;
    },
    onMutate: async ({ ids, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions-infinite'] });
      await queryClient.cancelQueries({ queryKey: ['transactions-all'] });

      const previousTotalAll = queryClient.getQueryData<Transaction[]>(['transactions-all']);

      if (previousTotalAll) {
        queryClient.setQueryData(['transactions-all'], (old: Transaction[] | undefined) => {
          if (!old) return [];
          return old.map(t => ids.includes(t.id) ? { ...t, ...updates } : t);
        });
      }

      queryClient.setQueriesData({ queryKey: ['transactions-infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: Transaction[]) =>
            page.map(t => ids.includes(t.id) ? { ...t, ...updates } : t)
          )
        };
      });

      return { previousTotalAll };
    },
    onSuccess: (_, variables, context) => {
      const updatedTxs = context?.previousTotalAll?.filter(t => variables.ids.includes(t.id)) || [];

      queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
      setSelectedIds(new Set());
    },
  });

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => setSelectedIds(new Set(ids)), []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const emergencyClearAll = async () => {
    await clearLocalTransactions();
    localStorage.removeItem('mibudget_transactions');
    if (window.indexedDB) indexedDB.deleteDatabase('mibudget_transactions_db');
    queryClient.clear();
  };

  return {
    transactions,
    selectedIds,
    sortBy,
    sortOrder,
    filters,
    totalCount,
    filteredCount,
    filteredSum: counts?.filteredSum || 0,
    hasActiveFilters: Object.keys(filters).length > 0,
    editingCell,
    setEditingCell,
    savingMap,
    isSaving: (id: string) => !!savingMap[id],
    handleSort,
    handleFilter,
    clearFilter,
    clearAllFilters,
    handleCellEdit,
    handleBulkCellEdit,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    bulkUpdateMutation,
    handleImport,
    handleAddTransaction,
    toggleSelection,
    selectAll,
    clearSelection,
    isLoading,
    isError,
    updateTransaction: updateTransactionMutation.mutate,
    bulkUpdate: (variables: { ids: string[], updates: Partial<Transaction> }) => bulkUpdateMutation.mutate(variables),
    bulkDelete: (ids: string[]) => bulkDeleteMutation.mutate(ids),
    deleteTransaction: (id: string) => bulkDeleteMutation.mutate([id]),
    differentiateTransaction: async (id: string, index: number = 1) => {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      // Parse current date and add hours based on index to ensure uniqueness within the group
      const baseDate = new Date(tx.date);
      if (isNaN(baseDate.getTime())) return;

      const newDate = new Date(baseDate.getTime() + (index * 60 * 60 * 1000));
      const newDateStr = newDate.toISOString();
      const newFingerprint = generateFingerprint({ ...tx, date: newDateStr });

      await bulkUpdateMutation.mutateAsync({
        ids: [id],
        updates: {
          date: newDateStr,
          fingerprint: newFingerprint
        }
      });
    },
    isBulkUpdating: bulkUpdateMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    projections,
    knownSources,
    splitTransaction: async (id: string, amount1: number) => {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      const previousAmount = tx.amount;
      const amount2 = previousAmount - amount1;

      await bulkUpdateMutation.mutateAsync({
        ids: [id],
        updates: { amount: amount1 }
      });

      const { id: _, created_at: cat, updated_at: uat, ...newData } = tx;
      await addTransactionMutation.mutateAsync({
        ...newData,
        amount: amount2,
        notes: `Split from original ${previousAmount}`
      });
    },
    emergencyClearAll: async () => {
      // Deprecated in favor of specific actions, but kept for legacy calls just in case
      await clearLocalTransactions();
      localStorage.removeItem('mibudget_transactions');
      queryClient.clear();
    },
    clearAllTransactions: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // 1. Delete all transactions from server
      const { error } = await (supabase as any)
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // 2. Clear local cache
      await clearLocalTransactions();
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
    },
    factoryReset: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // 1. Transactions
      await (supabase as any).from('transactions').delete().eq('user_id', userId);

      // 2. Rules
      await (supabase as any).from('source_rules').delete().eq('user_id', userId);
      await (supabase as any).from('merchant_rules').delete().eq('user_id', userId);

      // 3. Budgets & Categories (Cascading deletes should handle sub-resources)
      await (supabase as any).from('budget_category_limits').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Clean limits first if possible, or rely on cascade
      // Note: Delete categories carefully. Using a separate query to avoid blocking if tables don't exist
      try { await (supabase as any).from('sub_categories').delete().userIdIsIrrelevantHereAsWeNeedCascade ? null : null; } catch (e) { /* ignore */ }

      // We assume user_id is on categories. If not, this might fail or do nothing.
      await (supabase as any).from('categories').delete().eq('user_id', userId);
      await (supabase as any).from('budget_groups').delete().eq('user_id', userId);
      await (supabase as any).from('budgets').delete().eq('user_id', userId);

      // 4. Clear local
      await clearLocalTransactions();
      localStorage.clear();
      if (window.indexedDB) {
        try { indexedDB.deleteDatabase('mibudget_transactions_db'); } catch (e) { }
      }

      queryClient.clear();
      window.location.reload(); // Force reload to reset app state
    },
    isResolved: (t: Transaction) => !!(t.clean_source && knownSources.has(t.clean_source)),
    fixUnplannedStatus: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return;

      // 1. Update all transactions
      await (supabase as any)
        .from('transactions')
        .update({ planned: true })
        .eq('user_id', userId);

      // 2. Update all source rules
      await (supabase as any)
        .from('source_rules')
        .update({ auto_planned: true })
        .eq('user_id', userId);

      // 3. Update legacy merchant rules if they exist
      try {
        await (supabase as any)
          .from('merchant_rules')
          .update({ auto_planned: true })
          .eq('user_id', userId);
      } catch (e) {
        // Ignore if Table doesn't exist
      }

      await queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
      await queryClient.invalidateQueries({ queryKey: ['source-rules-simple'] });
    },
    purgeSoftDeletedTransactions: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { error } = await (supabase as any)
        .from('transactions')
        .delete()
        .eq('user_id', userId)
        .eq('excluded', true);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
    }
  };
};
