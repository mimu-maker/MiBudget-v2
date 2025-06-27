
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { FutureTransaction, NewTransactionForm, ProjectionData } from '@/types/projection';
import ProjectionChart from '@/components/Projection/ProjectionChart';
import AddTransactionForm from '@/components/Projection/AddTransactionForm';
import FutureTransactionsTable from '@/components/Projection/FutureTransactionsTable';

const Projection = () => {
  const [futureTransactions, setFutureTransactions] = useState<FutureTransaction[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTransaction, setNewTransaction] = useState<NewTransactionForm>({
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
  const generateProjectionData = (): ProjectionData[] => {
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

  const handleTransactionChange = (updates: Partial<NewTransactionForm>) => {
    setNewTransaction(prev => ({ ...prev, ...updates }));
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

      <ProjectionChart data={projectionData} />

      <AddTransactionForm
        showForm={showAddForm}
        newTransaction={newTransaction}
        onTransactionChange={handleTransactionChange}
        onSubmit={handleAddTransaction}
        onCancel={() => setShowAddForm(false)}
      />

      <FutureTransactionsTable
        transactions={futureTransactions}
        onDelete={handleDeleteTransaction}
      />
    </div>
  );
};

export default Projection;
