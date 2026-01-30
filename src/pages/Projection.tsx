import { useState, useMemo } from 'react';
import { FutureTransaction, NewTransactionForm, ProjectionData, RecurringInterval } from '@/types/projection';
import ProjectionChart from '@/components/Projection/ProjectionChart';
import AddTransactionFormV2 from '@/components/Projection/AddTransactionFormV2';
import IncomeTransactionsTable from '@/components/Projection/IncomeTransactionsTable';
import ExpenseTransactionsTable from '@/components/Projection/ExpenseTransactionsTable';
import PasteDataDialog from '@/components/Projection/PasteDataDialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import SuggestProjectionsWizard from '@/components/Projection/SuggestProjectionsWizard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Projection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteDialogType, setPasteDialogType] = useState<'income' | 'expense'>('income');

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear + 1, currentYear + 2];
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  // 1. Fetch Projections from Supabase
  const { data: projections = [], isLoading: isLoadingProjections } = useQuery({
    queryKey: ['projections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projections' as any)
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Fetch Actual Transactions (Complete only)
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', 'complete'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'Complete')
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const [newTransaction, setNewTransaction] = useState<NewTransactionForm>({
    date: new Date().toISOString().slice(0, 10),
    merchant: '',
    amount: '',
    category: 'Food',
    stream: '',
    planned: true,
    recurring: 'Monthly',
    description: ''
  });

  // Matching Logic: For each projection in the selected year, find matching actual transactions
  const matchProjectionsToActuals = (projList: any[], actualList: any[]) => {
    return projList.map(p => {
      // Find actuals that match this projection:
      // Simple heuristic: same category/merchant within the same month
      const projMonth = p.date.slice(0, 7);
      const matches = actualList.filter(tx => {
        // Priority 1: Explicit ID matching
        if (tx.projection_id === p.id) return true;

        // Priority 2: Heuristic matching (only if transaction isn't linked to something else)
        if (tx.projection_id) return false;

        const txMonth = tx.date.slice(0, 7);
        const nameMatch = tx.clean_merchant?.toLowerCase() === p.merchant.toLowerCase() ||
          tx.merchant.toLowerCase() === p.merchant.toLowerCase();
        return txMonth === projMonth && nameMatch;
      });

      const actualAmount = matches.reduce((sum, tx) => sum + tx.amount, 0);

      return {
        ...p,
        actual_amount: actualAmount,
        is_matched: matches.length > 0
      };
    });
  };

  const futureTransactions = useMemo(() =>
    matchProjectionsToActuals(projections, transactions),
    [projections, transactions]
  );

  // Mutations
  const addProjectionMutation = useMutation({
    mutationFn: async (newP: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('projections' as any)
        .insert([{ ...newP, user_id: userData.user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({
        title: "Success",
        description: "Projection added successfully",
      });
    },
    onError: (error) => {
      console.error('Add Projection error:', error);
      toast({
        title: "Error",
        description: "Failed to add projection. Please check the console.",
        variant: "destructive",
      });
    }
  });

  const deleteProjectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projections' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({
        title: "Deleted",
        description: "Projection removed",
      });
    },
    onError: (error) => {
      console.error('Delete Projection error:', error);
      toast({
        title: "Error",
        description: "Failed to delete projection",
        variant: "destructive",
      });
    }
  });

  const updateProjectionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number, updates: any }) => {
      const { error } = await supabase
        .from('projections' as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({
        title: "Updated",
        description: "Projection changes saved",
      });
    },
    onError: (error) => {
      console.error('Update Projection error:', error);
      toast({
        title: "Error",
        description: "Failed to update projection",
        variant: "destructive",
      });
    }
  });

  // Derived Data
  const incomeTransactions = useMemo(() =>
    futureTransactions.filter(t => t.amount >= 0 && (t.recurring !== 'N/A' || t.date.startsWith(selectedYear))),
    [futureTransactions, selectedYear]
  );

  const expenseTransactions = useMemo(() =>
    futureTransactions.filter(t => t.amount < 0 && (t.recurring !== 'N/A' || t.date.startsWith(selectedYear))),
    [futureTransactions, selectedYear]
  );

  const projectionData = useMemo(() => {
    const data: ProjectionData[] = [];
    const yearNum = parseInt(selectedYear);

    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const monthDate = new Date(yearNum, monthIdx, 1);
      const monthKey = monthDate.toISOString().slice(0, 7);

      let monthTotal = 0;

      futureTransactions.forEach(t => {
        const transDate = new Date(t.date);
        const transMonthKey = t.date.slice(0, 7);

        // Handle override for current month processing
        const monthOverride = t.overrides?.[monthKey];
        const effectiveAmount = monthOverride?.amount ?? t.amount;

        // Logic for taking Actual if it exists, otherwise Projected
        const amountToUse = (t.actual_amount !== undefined && t.actual_amount !== 0 && transMonthKey === monthKey)
          ? t.actual_amount
          : effectiveAmount;

        if (t.recurring === 'N/A') {
          if (transMonthKey === monthKey) {
            monthTotal += amountToUse;
          }
        } else if (t.recurring === 'Monthly') {
          // If transaction started before or during this month
          if (new Date(t.date) <= new Date(yearNum, monthIdx, 28)) {
            monthTotal += amountToUse;
          }
        } else if (t.recurring === 'Annually') {
          if (transDate.getMonth() === monthIdx) {
            monthTotal += amountToUse;
          }
        } else if (t.recurring === 'Bi-annually') {
          const firstMonth = transDate.getMonth();
          const secondMonth = (firstMonth + 6) % 12;
          if (monthIdx === firstMonth || monthIdx === secondMonth) {
            monthTotal += amountToUse;
          }
        } else if (t.recurring === 'Quarterly') {
          const startMonth = transDate.getMonth();
          if ((monthIdx - startMonth) % 3 === 0) {
            monthTotal += amountToUse;
          }
        }
      });

      data.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        value: monthTotal,
        date: monthKey
      });
    }
    return data;
  }, [futureTransactions, selectedYear]);

  const handleAddTransaction = () => {
    // Loosened validation: allow merchant OR stream
    if ((!newTransaction.merchant && !newTransaction.stream) || !newTransaction.amount) {
      return;
    }

    addProjectionMutation.mutate({
      ...newTransaction,
      amount: parseFloat(newTransaction.amount) || 0,
      date: newTransaction.date || new Date().toISOString().slice(0, 10)
    });
    resetForm();
  };

  const resetForm = () => {
    setNewTransaction({
      date: new Date().toISOString().slice(0, 10),
      merchant: '',
      amount: '',
      category: transactionType === 'income' ? 'Income' : 'Food',
      stream: '',
      planned: true,
      recurring: 'Monthly',
      description: ''
    });
    setShowAddForm(false);
  };

  const handleDeleteTransaction = (id: any) => {
    deleteProjectionMutation.mutate(id);
  };

  const handleTransactionChange = (updates: Partial<NewTransactionForm>) => {
    setNewTransaction(prev => ({ ...prev, ...updates }));
  };

  const handleAddClick = (type: 'income' | 'expense') => {
    setTransactionType(type);
    setNewTransaction({
      date: new Date().toISOString().slice(0, 10),
      merchant: '',
      amount: '',
      category: type === 'income' ? 'Income' : 'Food',
      stream: '',
      planned: true,
      recurring: 'Monthly',
      description: ''
    });
    setShowAddForm(true);
  };

  const handlePasteClick = (type: 'income' | 'expense') => {
    setPasteDialogType(type);
    setShowPasteDialog(true);
  };

  const handlePasteImport = (pastedTransactions: any[]) => {
    pastedTransactions.forEach(t => {
      addProjectionMutation.mutate({
        ...t,
        stream: t.subCategory || '',
        recurring: 'N/A' as RecurringInterval
      });
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Financial Projection</h1>
          <Button
            variant="outline"
            onClick={() => setShowWizard(true)}
            className="gap-2 text-primary border-primary hover:bg-primary/10"
          >
            <Sparkles className="w-4 h-4" />
            Suggest Projections
          </Button>
        </div>

        <Tabs value={selectedYear} onValueChange={setSelectedYear} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-3">
            {availableYears.map(year => (
              <TabsTrigger key={year} value={year.toString()}>
                {year}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <ProjectionChart data={projectionData} title={`Projection for ${selectedYear}`} />

      <AddTransactionFormV2
        showForm={showAddForm}
        transactionType={transactionType}
        newTransaction={newTransaction}
        onTransactionChange={handleTransactionChange}
        onSubmit={handleAddTransaction}
        onCancel={resetForm}
        onPasteClick={() => handlePasteClick(transactionType)}
      />

      <div className="space-y-6 mt-6">
        <IncomeTransactionsTable
          transactions={incomeTransactions}
          onDelete={handleDeleteTransaction}
          onUpdate={(id, updates) => updateProjectionMutation.mutate({ id, updates })}
          onAddClick={() => handleAddClick('income')}
          selectedYear={selectedYear}
        />

        <ExpenseTransactionsTable
          transactions={expenseTransactions}
          onDelete={handleDeleteTransaction}
          onUpdate={(id, updates) => updateProjectionMutation.mutate({ id, updates })}
          onAddClick={() => handleAddClick('expense')}
          selectedYear={selectedYear}
        />
      </div>

      <PasteDataDialog
        open={showPasteDialog}
        onClose={() => setShowPasteDialog(false)}
        onImport={handlePasteImport}
        transactionType={pasteDialogType}
      />

      <SuggestProjectionsWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onAddProjections={(projectionsToAdd) => {
          projectionsToAdd.forEach(p => addProjectionMutation.mutate(p));
          setShowWizard(false);
        }}
      />
    </div>
  );
};

export default Projection;
