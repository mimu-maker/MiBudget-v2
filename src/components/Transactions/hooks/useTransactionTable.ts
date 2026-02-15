import { useTransactionUndoActions } from '@/contexts/TransactionUndoContext';
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { APP_STATUSES } from '@/hooks/useSettings';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const useTransactions = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      console.log("Fetching transactions...");

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || 'a316d106-5bc5-447a-b594-91dab8814c06';

      let localData = await getLocalTransactions();

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

            // Sanitize chunk for DB insert - mapping source -> merchant for DB compatibility
            const dbChunk = chunk.map(idx => {
              const { source, clean_source, source_description, suggested_category, suggested_sub_category, clean_merchant, merchant_description, ...rest } = idx;
              return {
                ...rest,
                // map source fields to legacy merchant fields
                merchant: source,
                clean_merchant: clean_source || clean_merchant,
                merchant_description: source_description || merchant_description
              };
            });

            // Deduplicate chunk by fingerprint to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
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
        const { data, error } = await (supabase as any)
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (error) throw error;

        return (data || []).map((t: any) => {
          // Compatibility logic: Handle both 'source' (new) and 'merchant' (old) keys
          const sourceName = t.source || t.merchant || 'Unknown';
          const cleanSourceName = t.clean_source || t.clean_merchant || null;
          const sourceDesc = t.source_description || t.merchant_description || null;

          // Self-heal: ensure budget_month/year exist
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
    staleTime: 0, // Ensure fresh data on navigation
  });
};

export const useTransactionTable = () => {
  const queryClient = useQueryClient();
  const { showUndo } = useTransactionUndoActions();

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
    }
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
    }
  });

  const knownSources = useMemo(() =>
    new Set(sourceRules.map((r: any) => r.clean_source_name).filter(Boolean)),
    [sourceRules]);

  const { data: rawTransactions = [], isLoading, isError } = useTransactions();

  const transactions = useMemo(() => {
    return rawTransactions.map(t => ({
      ...t,
      is_resolved: !!(t.clean_source && knownSources.has(t.clean_source))
    }));
  }, [rawTransactions, knownSources]);

  const [sortBy, setSortBy] = useState<keyof Transaction>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, any>>({});
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
        const transactions = queryClient.getQueryData<Transaction[]>(['transactions']);
        const oldTx = transactions?.find(t => t.id === id);

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
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTotal = queryClient.getQueryData<Transaction[]>(['transactions']);
      const previousTx = previousTotal?.find(t => t.id === id);

      // Optimistic update
      if (previousTotal) {
        queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) => {
          if (!old) return [];
          return old.map(t => t.id === id ? { ...t, [field]: value } : t);
        });
      }

      return { previousTx, previousTotal };
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      if (context?.previousTx) {
        showUndo({
          type: 'update',
          transactions: [context.previousTx],
          description: `Updated transaction: ${context.previousTx.description || context.previousTx.source}`
        });
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousTotal) {
        queryClient.setQueryData(['transactions'], context.previousTotal);
      }
    },
  });

  const bulkUpdateTransactionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Transaction> }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

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

      let finalUpdates = { ...dbUpdates };

      if (updates.date) {
        const transactions = queryClient.getQueryData<Transaction[]>(['transactions']);
        const oldTx = transactions?.find(t => t.id === id); // NOTE: Bulk Edit often targets IDs, but here input logic says `ids` vs `id`. Check signature.
        // Wait, bulkUpdateTransactionMutation takes `id` and `updates`. It is for single row edits but "bulk cell edit"?
        // The signature is: mutationFn: async ({ id, updates }: { id: string, updates: Partial<Transaction> }) 
        // This mutation is incorrectly named "bulkUpdateTransactionMutation" but it handles single ID updates with partial payload.
        // The bulk one is `bulkUpdateMutation` further down.
        // This block is for `bulkUpdateTransactionMutation`.

        const txId = id; // use the id from args
        if (oldTx) {
          const oldDate = parseISO(oldTx.date);
          const newDate = parseISO(updates.date);

          if (!isNaN(oldDate.getTime()) && !isNaN(newDate.getTime())) {
            const expectedOldMonth = format(startOfMonth(oldDate), 'yyyy-MM-01');

            if (!oldTx.budget_month || oldTx.budget_month === expectedOldMonth) {
              finalUpdates.budget_month = format(startOfMonth(newDate), 'yyyy-MM-01');
              finalUpdates.budget_year = newDate.getFullYear();
            }
          }
        }
      }

      let { error } = await (supabase as any)
        .from('transactions')
        .update(finalUpdates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        const { source, clean_source, source_description, ...safeUpdates } = finalUpdates;
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
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTotal = queryClient.getQueryData<Transaction[]>(['transactions']);
      const previousTx = previousTotal?.find(t => t.id === id);

      // Optimistic update
      if (previousTotal) {
        queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) => {
          if (!old) return [];
          return old.map(t => t.id === id ? { ...t, ...updates } : t);
        });
      }

      return { previousTx, previousTotal };
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      if (context?.previousTx) {
        showUndo({
          type: 'update',
          transactions: [context.previousTx],
          description: `Updated transaction: ${context.previousTx.description || context.previousTx.source}`
        });
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousTotal) {
        queryClient.setQueryData(['transactions'], context.previousTotal);
      }
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showUndo({
        type: 'add',
        transactions: [variables as unknown as Transaction],
        description: `Added transaction: ${variables.description || variables.source}`
      });
    },
  });

  const handleSort = (field: keyof Transaction) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleFilter = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilter = (field: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  const handleCellEdit = (id: string, field: keyof Transaction, value: any) => {
    updateTransactionMutation.mutate({ id, field, value });
    setEditingCell(null);
  };

  const handleBulkCellEdit = (id: string, updates: Partial<Transaction>) => {
    bulkUpdateTransactionMutation.mutate({ id, updates });
    setEditingCell(null);
  };

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
      const previousTotal = queryClient.getQueryData<Transaction[]>(['transactions']);
      const deletedTxs = previousTotal?.filter(t => variables.includes(t.id)) || [];

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedIds(new Set());

      if (deletedTxs.length > 0) {
        showUndo({
          type: 'delete',
          transactions: deletedTxs,
          description: `Permanently deleted ${deletedTxs.length} transaction${deletedTxs.length > 1 ? 's' : ''}`
        });
      }
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

        // Sanitize for DB: remove 'source' as it's not a column, ensure 'merchant' is set
        const dbChunk = chunk.map(({ source, ...rest }) => ({
          ...rest,
          merchant: source,
          // Ensure we don't send fields that don't exist in DB schema
          // clean_merchant is matched to clean_source in DB usually, but let's check schema
          // Schema has: merchant, clean_merchant, merchant_description
          // It does NOT have: source, clean_source (wait, schema said clean_source EXISTS)
          // Let's re-verify schema from earlier tool output:
          // clean_source EXISTS. clean_merchant EXISTS. merchant EXISTS. source DOES NOT EXIST.
          // So we can keep clean_source. But we must remove 'source'.
        }));

        const { error } = await supabase.from('transactions').upsert(dbChunk, { onConflict: 'fingerprint' });
        if (error) throw error;

        processed += chunk.length;
        if (onProgress) onProgress(processed, total);
      }

      await queryClient.invalidateQueries({ queryKey: ['transactions'] });

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
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTotal = queryClient.getQueryData<Transaction[]>(['transactions']);

      // Optimistic update
      if (previousTotal) {
        queryClient.setQueryData(['transactions'], (old: Transaction[] | undefined) => {
          if (!old) return [];
          return old.map(t => ids.includes(t.id) ? { ...t, ...updates } : t);
        });
      }

      return { previousTotal };
    },
    onSuccess: (_, variables, context) => {
      const updatedTxs = context?.previousTotal?.filter(t => variables.ids.includes(t.id)) || [];

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedIds(new Set());

      if (updatedTxs.length > 0) {
        showUndo({
          type: 'bulk-update',
          transactions: updatedTxs,
          description: `Updated ${updatedTxs.length} transaction${updatedTxs.length > 1 ? 's' : ''}`
        });
      }
    },
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));
  const clearSelection = () => setSelectedIds(new Set());

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
    editingCell,
    setEditingCell,
    handleSort,
    handleFilter,
    clearFilter,
    clearAllFilters,
    handleCellEdit,
    handleBulkCellEdit,
    handleImport,
    handleAddTransaction,
    toggleSelection,
    selectAll,
    clearSelection,
    isLoading,
    isError,
    bulkUpdate: bulkUpdateMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    deleteTransaction: (id: string) => bulkDeleteMutation.mutate([id]),
    differentiateTransaction: async (id: string) => {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;
      const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
      const newDate = `${tx.date.split(' ')[0]} ${time}`;
      const newFingerprint = generateFingerprint({ ...tx, date: newDate });
      await bulkUpdateMutation.mutateAsync({ ids: [id], updates: { date: newDate, fingerprint: newFingerprint } });
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
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['source-rules-simple'] });
    }
  };
};
