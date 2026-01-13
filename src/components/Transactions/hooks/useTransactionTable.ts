
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Transaction {
  id: string; // Changed to string for UUID
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
  // New fields
  clean_description?: string;
  budget_month?: string;
  suggested_category?: string;
  suggested_sub_category?: string;
  merchant_description?: string;
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
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
    id: "2",
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
    id: "3",
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
    id: "4",
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
    id: "5",
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

// Local Storage Keys
const STORAGE_KEY = 'mibudget_transactions';

const getStoredTransactions = (): Transaction[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return mockTransactions; // Seed with mock data if empty
};

const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
};

const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      // Simulate network delay for realism/state updates
      await new Promise(resolve => setTimeout(resolve, 500));
      return getStoredTransactions();
    },
  });
};

export const useTransactionTable = () => {
  const queryClient = useQueryClient();
  const { data: transactions = [] } = useTransactions();

  const [sortBy, setSortBy] = useState<keyof Transaction>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [editingCell, setEditingCell] = useState<{ id: string, field: keyof Transaction } | null>(null);

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string, field: keyof Transaction, value: any }) => {
      const currentTransactions = getStoredTransactions();
      const updated = currentTransactions.map(t => {
        if (t.id === id) {
          // Handle specific field logic if needed
          if (field === 'subCategory') {
            return { ...t, subCategory: value, sub_category: value };
          }
          return { ...t, [field]: value };
        }
        return t;
      });
      saveTransactions(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (newTransaction: Omit<Transaction, 'id'>) => {
      const currentTransactions = getStoredTransactions();
      const transaction: Transaction = {
        ...newTransaction,
        id: crypto.randomUUID(), // Generate a real UUID
        clean_description: newTransaction.clean_description,
        budget_month: newTransaction.budget_month,
        suggested_category: newTransaction.suggested_category,
        suggested_sub_category: newTransaction.suggested_sub_category,
        merchant_description: newTransaction.merchant_description
      };

      saveTransactions([transaction, ...currentTransactions]);
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

  const handleImport = (importedTransactions: any[]) => {
    // Bulk import optimization
    const currentTransactions = getStoredTransactions();
    const newTransactions = importedTransactions.map((t, index) => ({
      ...t,
      id: t.id || crypto.randomUUID(),
      amount: parseFloat(t.amount) || 0,
      // Ensure defaults
      status: t.status || 'New',
      budget: t.budget || 'Budgeted',
      recurring: t.recurring || 'No',
      planned: t.planned || false,
    }));

    saveTransactions([...newTransactions, ...currentTransactions]);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
