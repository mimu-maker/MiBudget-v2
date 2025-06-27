
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload } from 'lucide-react';

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
  const [sortBy, setSortBy] = useState('date');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Transactions</CardTitle>
            <div className="flex items-center space-x-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Housing">Housing</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Description</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Account</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Budget</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Category</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Sub-category</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700">Planned</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Recurring</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      transaction.budget === 'Exclude' ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-3 px-2 text-sm">{transaction.date}</td>
                    <td className="py-3 px-2">
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        {transaction.note && (
                          <div className="text-xs text-gray-500 mt-1">{transaction.note}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={`font-bold ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount.toLocaleString()} DKK
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm">{transaction.account}</td>
                    <td className="py-3 px-2">
                      <Badge variant={getStatusBadgeVariant(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={getBudgetBadgeVariant(transaction.budget)}>
                        {transaction.budget}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-sm">{transaction.category}</td>
                    <td className="py-3 px-2 text-sm">{transaction.subCategory}</td>
                    <td className="py-3 px-2 text-center">
                      <Badge variant={transaction.planned ? 'default' : 'outline'}>
                        {transaction.planned ? 'Yes' : 'No'}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-sm">{transaction.recurring}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
