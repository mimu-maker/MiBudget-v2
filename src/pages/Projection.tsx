
import { useState } from 'react';
import { FutureTransaction, NewTransactionForm, ProjectionData } from '@/types/projection';
import ProjectionChart from '@/components/Projection/ProjectionChart';
import AddTransactionFormV2 from '@/components/Projection/AddTransactionFormV2';
import IncomeTransactionsTable from '@/components/Projection/IncomeTransactionsTable';
import ExpenseTransactionsTable from '@/components/Projection/ExpenseTransactionsTable';
import PasteDataDialog from '@/components/Projection/PasteDataDialog';

const Projection = () => {
  const [futureTransactions, setFutureTransactions] = useState<FutureTransaction[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteDialogType, setPasteDialogType] = useState<'income' | 'expense'>('income');

  const [newTransaction, setNewTransaction] = useState<NewTransactionForm>({
    date: '',
    merchant: '',
    amount: '',
    account: 'Master',
    status: 'Planned',
    budget: 'Budgeted',
    category: 'Food',
    subCategory: '',
    planned: true,
    recurring: false,
    description: ''
  });

  // Split transactions into income and expenses
  const incomeTransactions = futureTransactions.filter(t => t.amount >= 0);
  const expenseTransactions = futureTransactions.filter(t => t.amount < 0);

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
    if (!newTransaction.date || !newTransaction.merchant || !newTransaction.amount) {
      return;
    }

    const transaction: FutureTransaction = {
      id: Date.now(),
      ...newTransaction,
      amount: parseFloat(newTransaction.amount) || 0
    };

    setFutureTransactions(prev => [...prev, transaction]);
    resetForm();
  };

  const resetForm = () => {
    setNewTransaction({
      date: '',
      merchant: '',
      amount: '',
      account: 'Master',
      status: 'Planned',
      budget: 'Budgeted',
      category: transactionType === 'income' ? 'Income' : 'Food',
      subCategory: '',
      planned: true,
      recurring: false,
      description: ''
    });
    setShowAddForm(false);
  };

  const handleDeleteTransaction = (id: number) => {
    setFutureTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleTransactionChange = (updates: Partial<NewTransactionForm>) => {
    setNewTransaction(prev => ({ ...prev, ...updates }));
  };

  const handleAddClick = (type: 'income' | 'expense') => {
    setTransactionType(type);
    setNewTransaction({
      date: '',
      merchant: '',
      amount: '',
      account: 'Master',
      status: 'Planned',
      budget: 'Budgeted',
      category: type === 'income' ? 'Income' : 'Food',
      subCategory: '',
      planned: true,
      recurring: false,
      description: ''
    });
    setShowAddForm(true);
  };

  const handlePasteClick = (type: 'income' | 'expense') => {
    setPasteDialogType(type);
    setShowPasteDialog(true);
  };

  const handlePasteImport = (transactions: FutureTransaction[]) => {
    setFutureTransactions(prev => [...prev, ...transactions]);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Projection</h1>
      </div>

      <ProjectionChart data={projectionData} />

      <AddTransactionFormV2
        showForm={showAddForm}
        transactionType={transactionType}
        newTransaction={newTransaction}
        onTransactionChange={handleTransactionChange}
        onSubmit={handleAddTransaction}
        onCancel={resetForm}
      />

      <div className="space-y-6 mt-6">
        <IncomeTransactionsTable
          transactions={incomeTransactions}
          onDelete={handleDeleteTransaction}
          onAddClick={() => handleAddClick('income')}
          onPasteClick={() => handlePasteClick('income')}
        />

        <ExpenseTransactionsTable
          transactions={expenseTransactions}
          onDelete={handleDeleteTransaction}
          onAddClick={() => handleAddClick('expense')}
          onPasteClick={() => handlePasteClick('expense')}
        />
      </div>

      <PasteDataDialog
        open={showPasteDialog}
        onClose={() => setShowPasteDialog(false)}
        onImport={handlePasteImport}
        transactionType={pasteDialogType}
      />
    </div>
  );
};

export default Projection;
