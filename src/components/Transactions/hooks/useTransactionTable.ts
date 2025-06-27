
import { useState } from 'react';

interface Transaction {
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

export const useTransactionTable = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [sortBy, setSortBy] = useState<keyof Transaction>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [editingCell, setEditingCell] = useState<{id: number, field: keyof Transaction} | null>(null);

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
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
    setEditingCell(null);
  };

  const handleImport = (importedTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...importedTransactions]);
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions(prev => [...prev, newTransaction]);
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

export type { Transaction };
