import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { APP_STATUSES } from '@/hooks/useSettings';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseAmount, parseRecurringValue } from '@/lib/importUtils';
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
  recurring: string; // Changed from boolean to string
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

          // Filter out any transactions with invalid user_id (like "master-account-id")
          const validLocalData = localData.filter(t => {
            const isValidUserId = t.user_id && t.user_id !== 'master-account-id' && t.user_id.includes('-');
            if (!isValidUserId) {
              console.log('Filtering out invalid user_id transaction:', t.user_id);
            }
            return isValidUserId;
          });

          console.log(`Filtered to ${validLocalData.length} valid rows (removed ${localData.length - validLocalData.length} invalid rows)`);

          if (validLocalData.length === 0) {
            console.log('No valid local data to sync, clearing cache...');
            await clearLocalTransactions();
            return [];
          }

          // Get current authenticated user ID once
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id || 'a316d106-5bc5-447a-b594-91dab8814c06'; // Fallback to Michael's ID

          const toInsert = validLocalData.map(t => {
            const item = {
              id: t.id.length > 10 ? t.id : crypto.randomUUID(),
              user_id: userId, // ✅ Use actual authenticated user ID
              date: t.date || new Date().toISOString().split('T')[0],
              merchant: t.merchant || 'Unknown',
              amount: t.amount || 0,
              account: t.account || 'Unknown',
              status: t.status || 'Pending Triage',
              budget: t.budget || 'Budgeted',
              category: t.category || 'Other', // ✅ Ensure required category
              sub_category: t.sub_category || null,
              description: t.description || "",
              planned: t.planned || false,
              recurring: t.recurring || false,
              fingerprint: generateFingerprint(t),
              clean_merchant: t.clean_merchant || null,
              budget_month: t.budget_month || null,
              confidence: t.confidence || null
            };
            
            console.log('Cloud sync item:', item);
            return item;
          });

          console.log('First item being synced:', toInsert[0]);
          console.log('Sample data structure:', Object.keys(toInsert[0] || {}));

          const CHUNK_SIZE = 500;
          for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
            const chunk = toInsert.slice(i, i + CHUNK_SIZE);
            console.log(`Syncing chunk ${i/CHUNK_SIZE + 1} with ${chunk.length} items`);
            console.log('Chunk sample:', chunk[0]);
            
            const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'fingerprint' });
            if (error) {
              console.error('Cloud sync error:', error);
              console.error('Error details:', JSON.stringify(error, null, 2));
              throw error;
            }
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
        // Get actual authenticated user ID
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        
        console.log(`Using user ID for query: ${userId}`);
        
        const { data, error } = await (supabase as any)
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
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

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      const { error } = await (supabase as any)
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId); // ✅ Use actual authenticated user ID

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (newTransaction: Omit<Transaction, 'id'>) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      const transaction = {
        ...newTransaction,
        fingerprint: generateFingerprint(newTransaction),
        sub_category: newTransaction.subCategory || newTransaction.sub_category,
        user_id: userId, // ✅ Use actual authenticated user ID
        id: crypto.randomUUID()
      };
      
      // Remove subCategory from transaction object (database only has sub_category)
      delete transaction.subCategory;

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

  const handleImport = async (importedTransactions: any[]) => {
    console.log(`Starting bulk import of ${importedTransactions.length} transactions...`);
    
    // Get actual authenticated user ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      throw new Error('User not authenticated - cannot import transactions');
    }
    
    console.log(`Using user ID for import: ${userId}`);
    console.log('Sample transaction to import:', importedTransactions[0]);
    
    const toInsert = importedTransactions.map((t) => {
      const fingerprint = generateFingerprint(t);
      // Force status to be a valid value
      let status = t.status || 'Pending Triage';
      console.log(`Original status: "${t.status}" -> "${status}"`);
      if (!APP_STATUSES.includes(status)) {
        console.log(`Invalid status "${status}" found, defaulting to "Pending Triage"`);
        console.log('Available statuses:', APP_STATUSES);
        status = 'Pending Triage';
      }
      
      const transaction = {
        ...t,
        id: t.id || crypto.randomUUID(),
        user_id: userId, // ✅ Use actual authenticated user ID
        amount: parseAmount(t.amount.toString()) || 0,
        fingerprint,
        status: status, // ✅ Guaranteed valid status
        budget: t.budget || 'Budgeted',
        category: t.category || 'Other', // ✅ Ensure category is included
        planned: t.planned || false,
        recurring: parseRecurringValue(t.recurring), // Parse recurring value
        sub_category: t.subCategory || t.sub_category
      };
      
      // Remove subCategory from transaction object (database only has sub_category)
      delete transaction.subCategory;
      
      // Debug: Check status value
      console.log('Transaction status being inserted:', transaction.status);
      console.log('Full transaction object:', transaction);
      
      console.log('Processed transaction:', transaction);
      return transaction;
    });

    try {
      await saveLocalTransactions(toInsert);
    } catch (cacheError: any) {
      console.warn("Failed to persist import locally", cacheError?.message || cacheError);
    }

    try {
      const CHUNK_SIZE = 100;
      console.log(`Processing ${toInsert.length} transactions in chunks of ${CHUNK_SIZE}`);
      console.log('First 3 transactions to insert:', toInsert.slice(0, 3));
      console.log('User ID being used for import:', userId);
      
      for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);
        console.log(`Inserting chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(toInsert.length/CHUNK_SIZE)} with ${chunk.length} transactions`);
        console.log('Chunk sample data:', chunk[0]);
        
        const { error, data } = await supabase.from('transactions').upsert(chunk, { onConflict: 'fingerprint' });
        
        if (error) {
          console.error('Supabase insert error:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          throw error;
        }
        
        console.log(`Chunk insert result:`, { success: true, data: data ? data.length : 0, error: null });
        console.log(`Successfully inserted chunk ${Math.floor(i/CHUNK_SIZE) + 1}`);
      }
      
      console.log('All transactions successfully imported to Supabase!');
    } catch (err: any) {
      console.error("Supabase import failed:", err);
      console.warn("Falling back to local IndexedDB cache");
      // Local cache already updated above, so nothing else to do here
    }

    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
    const { id, ...transactionData } = newTransaction;
    addTransactionMutation.mutate(transactionData);
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      console.log(`Bulk deleting ${ids.length} transactions:`, ids);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated - cannot delete transactions');
      }
      
      const { error } = await (supabase as any)
        .from('transactions')
        .delete()
        .in('id', ids)
        .eq('user_id', userId); // ✅ Use actual authenticated user ID

      if (error) {
        console.error('Bulk delete error:', error);
        throw error;
      }
      
      console.log(`Successfully deleted ${ids.length} transactions`);
    },
    onSuccess: (data, variables) => {
      console.log(`Bulk delete success for ${variables.length} transactions`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedIds(new Set());
    },
    onError: (error) => {
      console.error('Bulk delete failed:', error);
      // You could add toast notification here
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[], updates: Partial<Transaction> }) => {
      console.log(`Bulk updating ${ids.length} transactions with:`, updates);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated - cannot update transactions');
      }
      
      const dbUpdates = { ...updates } as any;
      if (dbUpdates.subCategory) {
        dbUpdates.sub_category = dbUpdates.subCategory;
        delete dbUpdates.subCategory; // Remove subCategory, database only has sub_category
      }
      
      // Auto-exclude logic
      if (updates.status) {
        dbUpdates.excluded = (updates.status === 'Reconciled');
      }
      
      console.log('Final DB updates:', dbUpdates);
      
      const { error } = await (supabase as any)
        .from('transactions')
        .update(dbUpdates)
        .in('id', ids)
        .eq('user_id', userId); // ✅ Use actual authenticated user ID

      if (error) {
        console.error('Bulk update error:', error);
        throw error;
      }
      
      console.log(`Successfully updated ${ids.length} transactions`);
    },
    onSuccess: (data, variables) => {
      console.log(`Bulk update success for ${variables.ids.length} transactions`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedIds(new Set());
    },
    onError: (error) => {
      console.error('Bulk update failed:', error);
      // You could add toast notification here
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

  // Emergency clear function
  const emergencyClearAll = async () => {
    console.log('🚨 EMERGENCY CLEAR ALL TRANSACTIONS');
    
    // Clear local cache
    await clearLocalTransactions();
    
    // Clear localStorage
    localStorage.removeItem('mibudget_transactions');
    localStorage.removeItem('mibudget_selected_period');
    
    // Clear IndexedDB completely
    if (window.indexedDB) {
      indexedDB.deleteDatabase('mibudget_transactions_db');
    }
    
    // Clear React Query cache
    queryClient.clear();
    
    console.log('✅ All local data cleared');
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
    isBulkUpdating: bulkUpdateMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    emergencyClearAll,
  };
};
