
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  account: string;
  status: string;
  budget: string;
  category: string;
  subCategory: string;
  planned: boolean;
  recurring: string;
  note: string;
}

const mockTransactions: Transaction[] = [
  {
    id: 1,
    date: '2024-06-01',
    description: 'Salary deposit',
    amount: 45000,
    account: 'Master',
    status: 'Complete',
    budget: 'Budgeted',
    category: 'Income',
    subCategory: 'Salary',
    planned: true,
    recurring: 'Monthly',
    note: ''
  },
  {
    id: 2,
    date: '2024-06-02',
    description: 'Grocery shopping - Netto',
    amount: -1250,
    account: 'Joint',
    status: 'Complete',
    budget: 'Budgeted',
    category: 'Food',
    subCategory: 'Groceries',
    planned: true,
    recurring: 'Weekly',
    note: ''
  },
  {
    id: 3,
    date: '2024-06-05',
    description: 'Netflix subscription',
    amount: -89,
    account: 'Master',
    status: 'Complete',
    budget: 'Budgeted',
    category: 'Entertainment',
    subCategory: 'Streaming',
    planned: true,
    recurring: 'Monthly',
    note: ''
  },
  {
    id: 4,
    date: '2024-06-08',
    description: 'Restaurant dinner',
    amount: -450,
    account: 'Master',
    status: 'Pending Marcus',
    budget: 'Special',
    category: 'Food',
    subCategory: 'Dining Out',
    planned: false,
    recurring: 'No',
    note: 'Anniversary dinner'
  },
  {
    id: 5,
    date: '2024-06-12',
    description: 'Home repair materials',
    amount: -2800,
    account: 'Joint',
    status: 'Complete',
    budget: 'Klintemarken',
    category: 'Housing',
    subCategory: 'Maintenance',
    planned: false,
    recurring: 'No',
    note: 'Kitchen sink repair'
  }
];

const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching transactions:', error);
        // Return mock data for now
        return mockTransactions;
      }
      
      // Transform Supabase data to match our Transaction interface
      return data.map(row => ({
        id: parseInt(row.id),
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount.toString()),
        account: row.account,
        status: row.status,
        budget: row.budget,
        category: row.category,
        subCategory: row.sub_category || '',
        planned: row.planned,
        recurring: row.recurring,
        note: row.note || ''
      })) as Transaction[];
    },
  });
};

export const useTransactionTable = () => {
  const queryClient = useQueryClient();
  const { data: transactions = [] } = useTransactions();
  
  const [sortBy, setSortBy] = useState<keyof Transaction>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [editingCell, setEditingCell] = useState<{id: number, field: keyof Transaction} | null>(null);

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: number, field: keyof Transaction, value: any }) => {
      const updateData: any = {};
      
      // Map our field names to Supabase column names
      if (field === 'subCategory') {
        updateData.sub_category = value;
      } else {
        updateData[field] = value;
      }
      
      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id.toString()); // Convert to string for UUID comparison
      
      if (error) {
        console.error('Error updating transaction:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (newTransaction: Omit<Transaction, 'id'>) => {
      const insertData = {
        date: newTransaction.date,
        description: newTransaction.description,
        amount: newTransaction.amount,
        account: newTransaction.account,
        status: newTransaction.status,
        budget: newTransaction.budget,
        category: newTransaction.category,
        sub_category: newTransaction.subCategory,
        planned: newTransaction.planned,
        recurring: newTransaction.recurring,
        note: newTransaction.note,
        fingerprint: `${newTransaction.date}-${newTransaction.description}-${newTransaction.amount}` // Simple fingerprint
      };
      
      const { error } = await supabase
        .from('transactions')
        .insert([insertData]);
      
      if (error) {
        console.error('Error adding transaction:', error);
        throw error;
      }
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

  const handleCellEdit = (id: number, field: keyof Transaction, value: any) => {
    updateTransactionMutation.mutate({ id, field, value });
    setEditingCell(null);
  };

  const handleImport = (importedTransactions: Transaction[]) => {
    // For now, just add to local state
    // In a real implementation, you'd batch insert to Supabase
    importedTransactions.forEach(transaction => {
      addTransactionMutation.mutate(transaction);
    });
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
    const { id, ...transactionData } = newTransaction;
    addTransactionMutation.mutate(transactionData);
  };

  return {
    transactions,
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
    handleAddTransaction
  };
};
