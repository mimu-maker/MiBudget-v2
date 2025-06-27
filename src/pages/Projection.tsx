
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus } from 'lucide-react';

interface FutureTransaction {
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

const Projection = () => {
  const [futureTransactions, setFutureTransactions] = useState<FutureTransaction[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: '',
    description: '',
    amount: '',
    account: 'Master',
    status: 'Planned',
    budget: 'Budgeted',
    category: 'Food',
    subCategory: '',
    planned: true,
    recurring: 'No',
    note: ''
  });

  // Generate projection data based on future transactions
  const generateProjectionData = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      
      const monthTransactions = futureTransactions.filter(t => 
        t.date.startsWith(monthKey)
      );
      
      const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: monthTotal,
        date: monthKey
      });
    }
    
    return months;
  };

  const projectionData = generateProjectionData();

  const handleAddTransaction = () => {
    if (!newTransaction.date || !newTransaction.description || !newTransaction.amount) {
      return;
    }

    const transaction: FutureTransaction = {
      id: Date.now(),
      ...newTransaction,
      amount: parseFloat(newTransaction.amount) || 0
    };

    setFutureTransactions(prev => [...prev, transaction]);
    setNewTransaction({
      date: '',
      description: '',
      amount: '',
      account: 'Master',
      status: 'Planned',
      budget: 'Budgeted',
      category: 'Food',
      subCategory: '',
      planned: true,
      recurring: 'No',
      note: ''
    });
    setShowAddForm(false);
  };

  const handleDeleteTransaction = (id: number) => {
    setFutureTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Get minimum date for future transactions (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
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
        <h1 className="text-2xl font-bold text-gray-900">Financial Projection</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Future Transaction
        </Button>
      </div>

      {/* Line Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>12-Month Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} DKK`} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={(dataPoint) => dataPoint >= 0 ? "#10b981" : "#ef4444"}
                strokeWidth={3}
                dot={{ r: 6 }}
                strokeDasharray={0}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Add Transaction Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Future Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <Input
                  type="date"
                  value={newTransaction.date}
                  min={getMinDate()}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (DKK)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={newTransaction.description}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Transaction description"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Account</label>
                <Select value={newTransaction.account} onValueChange={(value) => setNewTransaction(prev => ({ ...prev, account: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Master">Master</SelectItem>
                    <SelectItem value="Joint">Joint</SelectItem>
                    <SelectItem value="Savings">Savings</SelectItem>
                    <SelectItem value="Investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Budget</label>
                <Select value={newTransaction.budget} onValueChange={(value) => setNewTransaction(prev => ({ ...prev, budget: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Budgeted">Budgeted</SelectItem>
                    <SelectItem value="Special">Special</SelectItem>
                    <SelectItem value="Klintemarken">Klintemarken</SelectItem>
                    <SelectItem value="Exclude">Exclude</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Select value={newTransaction.category} onValueChange={(value) => setNewTransaction(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Income">Income</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Housing">Housing</SelectItem>
                    <SelectItem value="Transport">Transport</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTransaction}>
                Add Transaction
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Future Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Future Transactions ({futureTransactions.length})</CardTitle>
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
                  <th className="text-center py-3 px-2 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {futureTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-gray-500">
                      No future transactions planned. Add some to see your projection.
                    </td>
                  </tr>
                ) : (
                  futureTransactions
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 text-sm">{transaction.date}</td>
                        <td className="py-3 px-2">
                          <div className="font-medium">{transaction.description}</div>
                          {transaction.note && (
                            <div className="text-xs text-gray-500 mt-1">{transaction.note}</div>
                          )}
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
                          <Badge variant="secondary">{transaction.status}</Badge>
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
                        <td className="py-3 px-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Projection;
