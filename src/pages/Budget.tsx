import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, Network } from 'lucide-react';
import BudgetSankey from '@/components/Budget/BudgetSankey';
import { useAnnualBudget, BudgetCategory, BudgetSubCategory } from '@/hooks/useAnnualBudget';
import { useBudgetCategoryActionsForBudget } from '@/hooks/useBudgetCategories';

// Import extracted components
import { BudgetTable } from '@/components/Budget/BudgetTable';
import { BudgetSummaryCards } from '@/components/Budget/BudgetSummaryCards';
import { BudgetYearNavigation } from '@/components/Budget/BudgetYearNavigation';

const Budget = () => {
  const { transactions } = useTransactionTable();
  const { settings } = useSettings();
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'sankey'>('table');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { budget, loading, error, refreshBudget } = useAnnualBudget(selectedYear);
  const { updateSubCategoryBudget: updateSubCategoryBudgetMutation } = useBudgetCategoryActionsForBudget(budget?.id);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear()); // Always include current year
    transactions.forEach(t => { if (t.date) years.add(new Date(t.date).getFullYear()); });
    if (budget?.year) years.add(budget.year);
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, budget]);

  // Calculate Actual Income from 'Complete' transactions
  const actualUniqueIncome = useMemo(() => {
    return transactions
      .filter(t => {
        if (!t.date) return false;
        const tYear = new Date(t.date).getFullYear();
        return tYear === selectedYear && t.status === 'Complete' && t.amount > 0;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedYear]);



  const minYear = availableYears.length > 0 ? Math.min(...availableYears) : new Date().getFullYear();
  const maxYear = availableYears.length > 0 ? Math.max(...availableYears) : new Date().getFullYear();

  const navigateYear = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedYear > minYear) setSelectedYear(selectedYear - 1);
    else if (direction === 'next' && selectedYear < maxYear) setSelectedYear(selectedYear + 1);
  };

  // Calculate Primary Expenses for Summary Cards (User Request: Budget YTD should be primary expenses only)
  // Calculate Primary Expenses for Summary Cards (User Request: Budget YTD should be primary expenses only)
  // FIXED: budget_amount is the MONTHLY amount (as seen in BudgetTable multiplying by 12 for annual).
  const primaryExpensesMonthlyBudget = budget?.category_groups?.expenditure?.reduce((sum, item) => sum + item.budget_amount, 0) || 0;
  const primaryExpensesAnnualBudget = primaryExpensesMonthlyBudget * 12;
  const primaryExpensesSpent = budget?.category_groups?.expenditure?.reduce((sum, item) => sum + item.spent, 0) || 0;

  // For total budget we want the Annual amount
  const totalBudgetForSummary = primaryExpensesAnnualBudget;
  // Monthly contribution is the monthly budget amount
  const monthlyContribution = primaryExpensesMonthlyBudget;

  const handleUpdateBudget = async (parentCategory: BudgetCategory, subCategory: BudgetSubCategory, value: string, type: 'annual' | 'monthly' | 'percent', currentKey: string) => {
    try {
      const numValue = parseFloat(value) || 0;
      let newMonthlyAmount = subCategory.budget_amount || 0;
      const totalIncome = budget?.category_groups?.income?.reduce((sum, item) => sum + item.budget_amount, 0) || 0;

      console.log('handleUpdateBudget called:', { parentCategoryName: parentCategory.name, subCategoryName: subCategory.name, value, type, currentKey });

      switch (type) {
        case 'annual': newMonthlyAmount = numValue / 12; break;
        case 'monthly': newMonthlyAmount = numValue; break;
        case 'percent': {
          const effectiveIncome = totalIncome > 0 ? totalIncome : 0.01;
          newMonthlyAmount = (numValue / 100) * effectiveIncome;
          break;
        }
      }

      if (updateSubCategoryBudgetMutation) {
        await updateSubCategoryBudgetMutation.mutateAsync({
          subCategoryId: subCategory.id,
          categoryId: parentCategory.id,
          amount: Number(newMonthlyAmount.toFixed(2))
        });
        // refreshBudget now returns a promise, so we can properly await it
        await refreshBudget();
      }
    } catch (e) {
      console.error('Failed to update budget', e);
    } finally {
      // Only clear if we are still editing the same field that initiated this update
      // This prevents race conditions when navigating between fields
      setEditingBudget(prev => prev === currentKey ? null : prev);
    }
  };

  if (loading && !budget) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading budget data...</p>
        </div>
      </div>
    );
  }

  if (error && !budget) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading budget: {error}</p>
          <Button onClick={refreshBudget}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No budget found for {selectedYear}</p>
          <Button asChild><Link to="/settings">Create Budget</Link></Button>
        </div>
      </div>
    );
  }

  const incomeData = budget?.category_groups?.income || [];
  const expenditureData = budget?.category_groups?.expenditure || [];
  const klintemarkenData = budget?.category_groups?.klintemarken || [];
  const specialData = budget?.category_groups?.special || [];
  // Use a minimum of 0.01 for totalIncome to prevent division by zero in UI calculations
  const totalBudgetedIncome = Math.max(incomeData.reduce((sum, item) => sum + item.budget_amount, 0), 0.01);

  // Use Actual Income as the denominator for % calculations (User Request)
  const percentageDenominator = actualUniqueIncome > 0 ? actualUniqueIncome : totalBudgetedIncome;

  console.log('📊 Budget Data Diagnostic:', {
    totalBudgetedIncome,
    actualUniqueIncome,
    percentageDenominator,
    incomeCategoriesCount: incomeData.length,
    incomeTotalFromData: incomeData.reduce((s, i) => s + i.budget_amount, 0),
    firstIncomeCategory: incomeData[0] ? { name: incomeData[0].name, budget: incomeData[0].budget_amount } : 'none'
  });

  const expandAll = (categories: string[]) => setExpandedCategories(new Set(categories));
  const collapseAll = () => setExpandedCategories(new Set());

  return (
    <div className="space-y-6 pt-4">
      <BudgetSummaryCards
        selectedYear={selectedYear}
        totalBudget={totalBudgetForSummary}
        totalSpent={primaryExpensesSpent}
        totalRemaining={totalBudgetForSummary - primaryExpensesSpent}
        monthlyContribution={monthlyContribution}
        projectedIncome={actualUniqueIncome}
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <BudgetYearNavigation
            selectedYear={selectedYear}
            minYear={minYear}
            maxYear={maxYear}
            availableYears={availableYears}
            onYearChange={setSelectedYear}
            navigateYear={navigateYear}
            monthlyContribution={monthlyContribution}
            totalAnnualBudget={budget.total_budget || 0}
          />
        </div>

        <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-[240px]">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50 rounded-2xl border border-border/50 shadow-sm">
            <TabsTrigger value="table" className="rounded-xl flex items-center gap-2 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              <Table className="w-4 h-4" />
              <span className="text-xs font-bold">Table</span>
            </TabsTrigger>
            <TabsTrigger value="sankey" className="rounded-xl flex items-center gap-2 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              <Network className="w-4 h-4" />
              <span className="text-xs font-bold">Sankey</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">

        <TabsContent value="table" className="space-y-6 mt-0 animate-in fade-in duration-500">
          {[
            { data: incomeData, type: 'income', title: 'Income Sources', color: 'emerald' },
            { data: expenditureData, type: 'expense', title: 'Primary Expenses', color: 'rose' },
            { data: klintemarkenData, type: 'klintemarken', title: 'Klintemarken Property', color: 'blue' },
            { data: specialData, type: 'special', title: 'Special Items', color: 'purple' }
          ].map(({ data, type, title, color }) => data.length > 0 && (
            <Card key={type} className={`shadow-sm border-${color}-100 bg-${color}-50/10 overflow-hidden rounded-3xl`}>
              <div className={`bg-${color}-50/50 border-b border-${color}-100 py-4 px-6 flex justify-between items-center`}>
                <CardTitle className={`text-xl text-${color}-800 flex items-center gap-2 font-bold`}>{title}</CardTitle>
                {type !== 'income' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => expandAll(data.map(d => d.name))} className="h-8 text-[10px] uppercase tracking-wider font-bold">Expand All</Button>
                    <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-[10px] uppercase tracking-wider font-bold">Collapse All</Button>
                  </div>
                )}
              </div>
              <CardContent className="p-0">
                <BudgetTable
                  data={data as any}
                  type={type as any}
                  expandedCategories={expandedCategories}
                  toggleCategory={toggleCategory}
                  editingBudget={editingBudget}
                  setEditingBudget={setEditingBudget}
                  handleUpdateBudget={handleUpdateBudget}
                  totalIncome={percentageDenominator}
                  currency={settings.currency}
                  selectedYear={selectedYear}
                />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sankey" className="mt-0 animate-in zoom-in-95 fade-in duration-500">
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center px-4">
              <h2 className="text-xl font-bold text-foreground mb-1">Financial Cash Flow</h2>
              <p className="text-sm text-muted-foreground max-w-md">Visualizing the flow of money from income sources through total funds and into expense categories.</p>
            </div>
            <BudgetSankey budgetData={budget.categories} />
          </div>
        </TabsContent>
      </Tabs >
    </div >
  );
};

export default Budget;
