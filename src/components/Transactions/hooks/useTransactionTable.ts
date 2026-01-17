
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseAmount } from '@/lib/importUtils';
import { getLocalTransactions, saveLocalTransactions, clearLocalTransactions } from '@/lib/localDb';

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  account: string;
  status: string;
  budget: string;
  category: string;
  subCategory: string;
  planned: boolean;
  recurring: boolean;
  description: string;
  budgetYear?: string;
  sub_category?: string;
  clean_merchant?: string;
  budget_month?: string;
  suggested_category?: string;
  suggested_sub_category?: string;
  merchant_description?: string;
  excluded?: boolean;
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

          const toInsert = localData.map(t => ({
            ...t,
            id: t.id.length > 10 ? t.id : undefined,
            fingerprint: generateFingerprint(t),
            sub_category: t.subCategory || t.sub_category,
            description: t.description || ""
          }));

          const CHUNK_SIZE = 500;
          for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
            const chunk = toInsert.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'fingerprint' });
            if (error) throw error;
          }

          console.log("Cloud sync complete. Cleaning local cache.");
          await clearLocalTransactions();
          localData = [];
        } catch (e: any) {
          console.warn("Cloud sync deferred (Offline/DNS issue). Using local data.");
          return localData;
        }
      }

      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;

        console.log(`Cloud sync successful: ${data?.length || 0} transactions processed.`);
        return (data || []).map((t: any) => ({
          ...t,
          subCategory: t.sub_category || ''
        })) as Transaction[];
      } catch (e: any) {
        console.warn("Using local fallback due to connection issue:", e.message);
        return localData;
      }
    },
    retry: 1,
    staleTime: 30000,
  });
};

export const useTransactionTable = () => {
  const queryClient = useQueryClient();
  const { data: transactions = [], isLoading, isError } = useTransactions();

  const [sortBy, setSortBy] = useState<keyof Transaction>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [editingCell, setEditingCell] = useState<{ id: string, field: keyof Transaction } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string, field: keyof Transaction, value: any }) => {
      const dbField = field === 'subCategory' ? 'sub_category' : field;
      const updates: any = { [dbField]: value };

      // Auto-exclude logic
      if (field === 'status') {
        updates.excluded = (value === 'Reconciled');
      }

      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (newTransaction: Omit<Transaction, 'id'>) => {
      const transaction = {
        ...newTransaction,
        fingerprint: generateFingerprint(newTransaction),
        sub_category: newTransaction.subCategory || newTransaction.sub_category,
        id: crypto.randomUUID()
      };

      const { error } = await supabase.from('transactions').insert([transaction]);
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

  const handleImport = async (importedTransactions: any[]) => {
    console.log(`Starting bulk import of ${importedTransactions.length} transactions...`);
    const toInsert = importedTransactions.map((t) => {
      const fingerprint = generateFingerprint(t);
      return {
        ...t,
        id: t.id || crypto.randomUUID(),
        amount: parseAmount(t.amount.toString()) || 0,
        fingerprint,
        status: t.status || 'Pending Triage',
        budget: t.budget || 'Budgeted',
        recurring: t.recurring === true || t.recurring === 'Yes' || (typeof t.recurring === 'string' && t.recurring !== 'No'),
        planned: t.planned || false,
        sub_category: t.subCategory || t.sub_category
      };
    });

    try {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'fingerprint' });
        if (error) throw error;
      }
    } catch (err: any) {
      console.warn("Supabase import failed, saving to local IndexedDB...", err.message);
      await saveLocalTransactions(toInsert);
    }

    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
    const { id, ...transactionData } = newTransaction;
    addTransactionMutation.mutate(transactionData);
  };

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[], updates: Partial<Transaction> }) => {
      const dbUpdates = { ...updates } as any;
      if (dbUpdates.subCategory) {
        dbUpdates.sub_category = dbUpdates.subCategory;
        delete dbUpdates.subCategory;
      }

      // Auto-exclude logic
      if (updates.status) {
        dbUpdates.excluded = (updates.status === 'Reconciled');
      }

      const { error } = await supabase
        .from('transactions')
        .update(dbUpdates)
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedIds(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids);

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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
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
  };
};
