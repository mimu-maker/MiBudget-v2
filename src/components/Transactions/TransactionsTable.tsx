
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { CsvImportDialog } from './CsvImportDialog';
import { AddTransactionDialog } from './AddTransactionDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

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

export const TransactionsTable = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [sortBy, setSortBy] = useState<keyof Transaction>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
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

  const filteredAndSortedTransactions = transactions
    .filter(transaction => {
      return Object.entries(filters).every(([field, filterValue]) => {
        if (!filterValue) return true;
        
        const transactionValue = transaction[field as keyof Transaction];
        
        if (field === 'date') {
          if (filterValue.type === 'month') {
            return new Date(transaction.date).getMonth() === parseInt(filterValue.value) - 1;
          } else if (filterValue.type === 'week') {
            const date = new Date(transaction.date);
            const week = Math.ceil(date.getDate() / 7);
            return week === parseInt(filterValue.value);
          } else if (filterValue.type === 'date') {
            return transaction.date === filterValue.value;
          }
        }
        
        return String(transactionValue).toLowerCase().includes(String(filterValue).toLowerCase());
      });
    })
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      } else {
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'Complete') return 'default';
    if (status.startsWith('Pending')) return 'secondary';
    return 'outline';
  };

  const getBudgetBadgeVariant = (budget: string) => {
    switch (budget) {
      case 'Budgeted': return 'default';
      case 'Special': return 'secondary';
      case 'Klintemarken': return 'outline';
      case 'Exclude': return 'destructive';
      default: return 'outline';
    }
  };

  const SortableHeader = ({ field, children }: { field: keyof Transaction, children: React.ReactNode }) => (
    <th className="text-left py-3 px-2 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => handleSort(field)}>
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortBy === field && (
          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </th>
  );

  const FilterableHeader = ({ field, children }: { field: string, children: React.ReactNode }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1">
          <Filter className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {field === 'date' ? (
          <>
            <DropdownMenuItem onClick={() => handleFilter(field, { type: 'month', value: new Date().getMonth() + 1 })}>
              This Month
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilter(field, { type: 'week', value: Math.ceil(new Date().getDate() / 7) })}>
              This Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilter(field, { type: 'date', value: new Date().toISOString().split('T')[0] })}>
              Today
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => clearFilter(field)}>
              Clear Filter
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <div className="p-2">
              <Input
                placeholder={`Filter ${field}...`}
                onChange={(e) => handleFilter(field, e.target.value)}
                className="w-40"
              />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => clearFilter(field)}>
              Clear Filter
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const EditableCell = ({ transaction, field }: { transaction: Transaction, field: keyof Transaction }) => {
    const isEditing = editingCell?.id === transaction.id && editingCell?.field === field;
    const value = transaction[field];

    if (isEditing) {
      if (field === 'account' || field === 'status' || field === 'budget' || field === 'category' || field === 'recurring') {
        const options = {
          account: ['Master', 'Joint', 'Savings', 'Investment'],
          status: ['Complete', 'Pending', 'Pending Marcus', 'Pending Sarah'],
          budget: ['Budgeted', 'Special', 'Klintemarken', 'Exclude'],
          category: ['Income', 'Food', 'Housing', 'Transport', 'Entertainment', 'Healthcare', 'Utilities'],
          recurring: ['No', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']
        };

        return (
          <Select
            value={String(value)}
            onValueChange={(newValue) => handleCellEdit(transaction.id, field, newValue)}
            onOpenChange={(open) => !open && setEditingCell(null)}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options[field].map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      } else if (field === 'planned') {
        return (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => handleCellEdit(transaction.id, field, checked)}
          />
        );
      } else {
        return (
          <Input
            value={String(value)}
            onChange={(e) => {
              const newValue = field === 'amount' ? parseFloat(e.target.value) || 0 : e.target.value;
              handleCellEdit(transaction.id, field, newValue);
            }}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
            className="h-8"
            autoFocus
          />
        );
      }
    }

    return (
      <div
        onClick={() => setEditingCell({ id: transaction.id, field })}
        className="cursor-pointer hover:bg-gray-50 p-1 rounded"
      >
        {field === 'amount' ? (
          <span className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {transaction.amount.toLocaleString()} DKK
          </span>
        ) : field === 'status' ? (
          <Badge variant={getStatusBadgeVariant(String(value))}>{String(value)}</Badge>
        ) : field === 'budget' ? (
          <Badge variant={getBudgetBadgeVariant(String(value))}>{String(value)}</Badge>
        ) : field === 'planned' ? (
          <Badge variant={Boolean(value) ? 'default' : 'outline'}>
            {Boolean(value) ? 'Yes' : 'No'}
          </Badge>
        ) : (
          String(value || '')
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setCsvImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </Button>
          <Button size="sm" onClick={() => setAddTransactionOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions ({filteredAndSortedTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <SortableHeader field="date">
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      <FilterableHeader field="date">Date</FilterableHeader>
                    </div>
                  </SortableHeader>
                  <SortableHeader field="description">
                    <div className="flex items-center space-x-1">
                      <span>Description</span>
                      <FilterableHeader field="description">Description</FilterableHeader>
                    </div>
                  </SortableHeader>
                  <SortableHeader field="amount">
                    <div className="flex items-center space-x-1">
                      <span>Amount</span>
                      <FilterableHeader field="amount">Amount</FilterableHeader>
                    </div>
                  </SortableHeader>
                  <SortableHeader field="account">
                    <div className="flex items-center space-x-1">
                      <span>Account</span>
                      <FilterableHeader field="account">Account</FilterableHeader>
                    </div>
                  </SortableHeader>
                  <SortableHeader field="status">
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      <FilterableHeader field="status">Status</FilterableHeader>
                    </div>
                  </SortableHeader>
                  <SortableHeader field="budget">
                    <div className="flex items-center space-x-1">
                      <span>Budget</span>
                      <FilterableHeader field="budget">Budget</FilterableHeader>
                    </div>
                  </SortableHeader>
                  <SortableHeader field="category">
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      <FilterableHeader field="category">Category</FilterableHeader>
                    </div>
                  </SortableHeader>
                  <SortableHeader field="subCategory">
                    <div className="flex items-center space-x-1">
                      <span>Sub-category</span>
                      <FilterableHeader field="subCategory">Sub-category</FilterableHeader>
                    </div>
                  </SortableHeader>
                  <SortableHeader field="planned">
                    <div className="flex items-center space-x-1">
                      <span>Planned</span>
                      <FilterableHeader field="planned">Planned</FilterableHeader>
                    </div>
                  </SortableHeader>
                  <SortableHeader field="recurring">
                    <div className="flex items-center space-x-1">
                      <span>Recurring</span>
                      <FilterableHeader field="recurring">Recurring</FilterableHeader>
                    </div>
                  </SortableHeader>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTransactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      transaction.budget === 'Exclude' ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-3 px-2">
                      <EditableCell transaction={transaction} field="date" />
                    </td>
                    <td className="py-3 px-2">
                      <div>
                        <EditableCell transaction={transaction} field="description" />
                        {transaction.note && (
                          <div className="text-xs text-gray-500 mt-1">{transaction.note}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <EditableCell transaction={transaction} field="amount" />
                    </td>
                    <td className="py-3 px-2">
                      <EditableCell transaction={transaction} field="account" />
                    </td>
                    <td className="py-3 px-2">
                      <EditableCell transaction={transaction} field="status" />
                    </td>
                    <td className="py-3 px-2">
                      <EditableCell transaction={transaction} field="budget" />
                    </td>
                    <td className="py-3 px-2">
                      <EditableCell transaction={transaction} field="category" />
                    </td>
                    <td className="py-3 px-2">
                      <EditableCell transaction={transaction} field="subCategory" />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <EditableCell transaction={transaction} field="planned" />
                    </td>
                    <td className="py-3 px-2">
                      <EditableCell transaction={transaction} field="recurring" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CsvImportDialog 
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onImport={handleImport}
      />
      
      <AddTransactionDialog
        open={addTransactionOpen}
        onOpenChange={setAddTransactionOpen}
        onAdd={handleAddTransaction}
      />
    </div>
  );
};
