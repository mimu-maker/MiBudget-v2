import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { APP_STATUSES } from '@/hooks/useSettings';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseAmount } from '@/lib/importUtils';
import { getLocalTransactions, saveLocalTransactions, clearLocalTransactions } from '@/lib/localDb';

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  merchant: string;
  amount: number;
  account: string;
  status: string;
  budget: string;
  category: string;
  sub_category: string | null;
  planned: boolean;
  recurring: string;
  description: string | null;
  budget_year?: number;
  clean_merchant?: string;
  budget_month?: string;
  suggested_category?: string;
  suggested_sub_category?: string;
  merchant_description?: string;
  excluded?: boolean;
  fingerprint?: string;
  confidence?: number;
  projection_id?: string;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
}

const generateFingerprint = (t: any) => {
  const str = `${t.date}-${t.merchant}-${t.amount}-${t.account}`;
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

      let localData = await getLocalTransactions();

      const storedLegacy = localStorage.getItem('mibudget_transactions');
      if (storedLegacy) {
        try {
          const legacyData = JSON.parse(storedLegacy);
          if (legacyData.length > 0) {
            console.log(`Migrating ${legacyData.length} records from localStorage to IndexedDB...`);
            await saveLocalTransactions(legacyData);
            localStorage.removeItem('mibudget_transactions');
            localData = await getLocalTransactions();
          }
        } catch (e) { console.error("Legacy migration failed:", e); }
      }

      if (localData.length > 0) {
        try {
          console.log(`Cloud Sync: Preparing to push ${localData.length} local rows...`);

          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id || 'a316d106-5bc5-447a-b594-91dab8814c06';

          const validLocalData = localData.filter(t => {
            const isValidUserId = t.user_id && t.user_id !== 'master-account-id' && t.user_id.includes('-');
            return isValidUserId;
          });

          if (validLocalData.length > 0) {
            const toInsert = validLocalData.map(t => ({
              id: t.id.length > 10 ? t.id : crypto.randomUUID(),
              user_id: userId,
              date: t.date || new Date().toISOString().split('T')[0],
              merchant: t.merchant || 'Unknown',
              amount: t.amount || 0,
              account: t.account || 'Unknown',
              status: t.status || 'Pending Triage',
              category: t.category || 'Other',
              sub_category: t.sub_category || null,
              description: t.description || "",
              planned: parseBool(t.planned),
              recurring: t.recurring || 'N/A',
              fingerprint: generateFingerprint(t),
              clean_merchant: t.clean_merchant || null,
              budget_month: t.budget_month || null,
              confidence: t.confidence || null,
              projection_id: t.projection_id || null,
              notes: t.notes || null
            }));

            const CHUNK_SIZE = 500;
            for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
              const chunk = toInsert.slice(i, i + CHUNK_SIZE);
              const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'fingerprint' });
              if (error) {
                console.error('Cloud sync error:', error);
                throw error;
              }
            }

            console.log("Cloud sync complete. Cleaning local cache.");
            await clearLocalTransactions();
            localData = [];
          }
        } catch (e: any) {
          console.warn("Cloud sync deferred / failed. Using local data.", e.message);
          return localData;
        }
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        const { data, error } = await (supabase as any)
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (error) throw error;

        return (data || []).map((t: any) => ({
          ...t,
          subCategory: t.sub_category || ''
        })) as Transaction[];
      } catch (e: any) {
        console.warn("Using local fallback due to issue:", e.message);
        return localData;
      }
    },
    retry: 1,
    staleTime: 30000,
  });
};

export const useTransactionTable = () => {
  const queryClient = useQueryClient();

  // Fetch projections for manual matching
  const { data: projections = [] } = useQuery({
    queryKey: ['projections-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projections' as any)
        .select('id, merchant, date, amount');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch known merchants for "Blue Pill" resolution
  const { data: merchantRules = [] } = useQuery({
    queryKey: ['merchant-rules-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_rules')
        .select('clean_merchant_name');
      if (error) throw error;
      return data || [];
    }
  });

  const knownMerchants = useMemo(() =>
    new Set(merchantRules.map((r: any) => r.clean_merchant_name).filter(Boolean)),
    [merchantRules]);

  const { data: transactions = [], isLoading, isError } = useTransactions();

  const [sortBy, setSortBy] = useState<keyof Transaction>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [editingCell, setEditingCell] = useState<{ id: string, field: keyof Transaction } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string, field: keyof Transaction, value: any }) => {
      const updates: any = { [field]: value };
      if (field === 'status') {
        updates.excluded = (value === 'Reconciled');
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { error } = await (supabase as any)
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return { id, field, value };
    },
    onMutate: async ({ id, field, value }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTransactions = queryClient.getQueryData(['transactions']);
      queryClient.setQueryData(['transactions'], (old: any) =>
        old?.map((t: Transaction) =>
          t.id === id ? { ...t, [field]: value } : t
        )
      );
      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
    },
  });

  const bulkUpdateTransactionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Transaction> }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const { error } = await (supabase as any)
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTransactions = queryClient.getQueryData(['transactions']);
      queryClient.setQueryData(['transactions'], (old: any) =>
        old?.map((t: Transaction) =>
          t.id === id ? { ...t, ...updates } : t
        )
      );
      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (newTransaction: Omit<Transaction, 'id'>) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const transaction = {
        ...newTransaction,
        fingerprint: generateFingerprint(newTransaction),
        user_id: userId,
        id: crypto.randomUUID()
      };
      const { error } = await (supabase as any).from('transactions').insert([transaction]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

  const handleCellEdit = (id: string, field: keyof Transaction, value: any) => {
    updateTransactionMutation.mutate({ id, field, value });
    setEditingCell(null);
  };

  const handleBulkCellEdit = (id: string, updates: Partial<Transaction>) => {
    bulkUpdateTransactionMutation.mutate({ id, updates });
    setEditingCell(null);
  };

  const handleImport = async (importedTransactions: any[]) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const toInsert = importedTransactions.map((t) => {
      const fingerprint = generateFingerprint(t);
      let status = t.status || 'Pending Triage';
      if (!APP_STATUSES.includes(status)) status = 'Pending Triage';

      return {
        ...t,
        id: t.id || crypto.randomUUID(),
        user_id: userId,
        amount: parseAmount(t.amount.toString()) || 0,
        fingerprint,
        status: status,
        category: t.category || 'Other',
        planned: parseBool(t.planned),
        recurring: t.recurring || 'N/A',
        sub_category: t.sub_category || null
      };
    });

    try {
      await saveLocalTransactions(toInsert);
      const CHUNK_SIZE = 100;
      for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'fingerprint' });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Supabase import failed:", err);
    }
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleAddTransaction = async (newTransaction: Transaction) => {
    const { id, ...transactionData } = newTransaction;
    await addTransactionMutation.mutateAsync(transactionData);
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');
      const { error } = await (supabase as any)
        .from('transactions')
        .delete()
        .in('id', ids)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedIds(new Set());
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[], updates: Partial<Transaction> }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');
      const dbUpdates = { ...updates } as any;
      if (updates.status) {
        dbUpdates.excluded = (updates.status === 'Reconciled');
      }
      const { error } = await (supabase as any)
        .from('transactions')
        .update(dbUpdates)
        .in('id', ids)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedIds(new Set());
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
    isBulkUpdating: bulkUpdateMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    projections,
    knownMerchants,
    emergencyClearAll,
  };
};
