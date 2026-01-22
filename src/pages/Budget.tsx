import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings as SettingsIcon, ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod, getPeriodInterval } from '@/lib/dateUtils';
import { eachMonthOfInterval } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { PeriodSelector } from '@/components/PeriodSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, Network } from 'lucide-react';
import BudgetSankey from '@/components/Budget/BudgetSankey';
import { useAnnualBudget, BudgetCategory, BudgetSubCategory } from '@/hooks/useAnnualBudget';
import { useBudgetCategoryActionsForBudget } from '@/hooks/useBudgetCategories';

const Budget = () => {
  const { transactions } = useTransactionTable();
  const { settings } = useSettings();
  const { selectedPeriod, customDateRange } = usePeriod();
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'sankey'>('table');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  
  // Use the new annual budget hook
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

  // Get available years from transactions and budgets
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    
    // Add years from transactions
    transactions.forEach(t => {
      if (t.date) {
        const year = new Date(t.date).getFullYear();
        years.add(year);
      }
    });
    
    // Add current year if we have budget data
    if (budget?.year) {
      years.add(budget.year);
    }
    
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, budget]);

  // Calculate year navigation bounds
  const minYear = availableYears.length > 0 ? Math.min(...availableYears) : new Date().getFullYear();
  const maxYear = availableYears.length > 0 ? Math.max(...availableYears) : new Date().getFullYear();
  
  // Navigate to previous/next year
  const navigateYear = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedYear > minYear) {
      setSelectedYear(selectedYear - 1);
    } else if (direction === 'next' && selectedYear < maxYear) {
      setSelectedYear(selectedYear + 1);
    }
  };

  // Calculate monthly contribution (annual budget / 12)
  const monthlyContribution = budget ? budget.total_budget / 12 : 0;

  // Handle year change
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  // Handle budget update with auto-calculation for sub-categories
  const handleUpdateBudget = async (
    parentCategory: BudgetCategory,
    subCategory: BudgetSubCategory,
    value: string,
    type: 'annual' | 'monthly' | 'percent'
  ) => {
    try {
      const numValue = parseFloat(value) || 0;
      let newMonthlyAmount = subCategory.budget_amount || 0;

      switch (type) {
        case 'annual':
          newMonthlyAmount = numValue / 12;
          break;
        case 'monthly':
          newMonthlyAmount = numValue;
          break;
        case 'percent':
          if (totalIncome > 0) {
            const annualTotal = totalIncome * 12;
            newMonthlyAmount = (numValue / 100) * annualTotal / 12;
          }
          break;
      }

      if (updateSubCategoryBudgetMutation) {
        await updateSubCategoryBudgetMutation.mutateAsync({
          subCategoryId: subCategory.id,
          amount: Number(newMonthlyAmount.toFixed(2))
        });
        await refreshBudget();
      }
    } catch (mutationError) {
      console.error('Failed to update budget', mutationError);
    } finally {
      setEditingBudget(null);
    }
  };

  const editingKey = (parentId: string, subId: string, field: 'annual' | 'monthly' | 'percent') => `${parentId}-${subId}-${field}`;

  // Show loading state only for initial load, not for data processing
  if (loading && !budget) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading budget data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Hide error states - show only loading for initial load
  if (error && !budget) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error loading budget: {error}</p>
            <Button onClick={refreshBudget}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  // Show no budget state
  if (!budget) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500 mb-4">No budget found for {selectedYear}</p>
            <Button asChild>
              <Link to="/settings">Create Budget</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Split Data by category groups in the correct order
  const incomeData = budget?.category_groups?.income || [];
  const expenditureData = budget?.category_groups?.expenditure || [];
  const klintemarkenData = budget?.category_groups?.klintemarken || [];
  const specialData = budget?.category_groups?.special || [];

  // Calculate total income for percentage calculations
  const totalIncome = incomeData.reduce((sum, item) => sum + item.budget_amount, 0);

  const expandAll = (categories: string[]) => {
    setExpandedCategories(new Set(categories));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const BudgetTable = ({ data, type, title }: { data: typeof budget.categories, type: 'income' | 'expense' | 'klintemarken' | 'special', title?: string }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className={`${type === 'income'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : type === 'klintemarken'
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
            : type === 'special'
            ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'} border-b uppercase text-[10px] font-bold tracking-widest`}>
            <th className="py-3 px-6 w-8"></th>
            <th className="py-3 px-2">{title || (type === 'income' ? 'Income' : type === 'klintemarken' ? 'Klintemarken' : type === 'special' ? 'Special' : 'Expenses')}</th>
            {type !== 'income' && <th className="py-3 px-3 text-right">Annual</th>}
            {type !== 'income' && <th className="py-3 px-3 text-right">Monthly</th>}
            {type !== 'income' && <th className="py-3 px-3 text-right">% of Income</th>}
            <th className="py-3 px-6 text-right">Actual Spend YTD</th>
            <th className="py-3 px-6 text-right">Vs Budget</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${type === 'income' ? 'divide-emerald-500/10' : type === 'klintemarken' ? 'divide-blue-500/10' : type === 'special' ? 'divide-purple-500/10' : 'divide-rose-500/10'}`}>
          {data.map((item) => {
            const isExpanded = expandedCategories.has(item.name);

            const renderSubCategories = () => {
              if (!isExpanded) return null;
              return item.sub_categories.map((subcat, subIndex) => {
                const annualKey = editingKey(item.id, subcat.id, 'annual');
                const monthlyKey = editingKey(item.id, subcat.id, 'monthly');
                const percentKey = editingKey(item.id, subcat.id, 'percent');

                return (
                  <tr
                    key={`${item.id}-${subcat.id}-${subIndex}`}
                    className={`text-[11px] text-muted-foreground/80 ${type === 'income' ? 'bg-emerald-500/5' : type === 'klintemarken' ? 'bg-blue-500/5' : type === 'special' ? 'bg-purple-500/5' : 'bg-rose-500/5'}`}
                  >
                    <td className="py-2 px-6"></td>
                    <td className="py-2 px-2 italic pl-6 font-medium">└ {subcat.name}</td>
                    {type !== 'income' && (
                      <>
                        <td className="py-2 px-3 text-right font-medium text-muted-foreground">
                          {editingBudget === annualKey ? (
                            <Input
                              defaultValue={((subcat.budget_amount || 0) * 12).toString()}
                              className="w-20 h-6 text-right ml-auto bg-background text-[10px]"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onBlur={(e) => handleUpdateBudget(item, subcat, e.target.value, 'annual')}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudget(item, subcat, e.currentTarget.value, 'annual')}
                            />
                          ) : (
                            <div
                              className="cursor-pointer hover:text-blue-500 rounded inline-flex items-center hover:bg-accent transition-all px-2 py-1"
                              onClick={(e) => { e.stopPropagation(); setEditingBudget(annualKey); }}
                            >
                              {formatCurrency((subcat.budget_amount || 0) * 12, settings.currency)}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-muted-foreground">
                          {editingBudget === monthlyKey ? (
                            <Input
                              defaultValue={(subcat.budget_amount || 0).toString()}
                              className="w-20 h-6 text-right ml-auto bg-background text-[10px]"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onBlur={(e) => handleUpdateBudget(item, subcat, e.target.value, 'monthly')}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudget(item, subcat, e.currentTarget.value, 'monthly')}
                            />
                          ) : (
                            <div
                              className="cursor-pointer hover:text-blue-500 rounded inline-flex items-center hover:bg-accent transition-all px-2 py-1"
                              onClick={(e) => { e.stopPropagation(); setEditingBudget(monthlyKey); }}
                            >
                              {formatCurrency(subcat.budget_amount || 0, settings.currency)}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-muted-foreground">
                          {editingBudget === percentKey ? (
                            <Input
                              defaultValue={totalIncome > 0 ? Math.round(((subcat.budget_amount || 0) / totalIncome) * 100).toString() : '0'}
                              className="w-16 h-6 text-right ml-auto bg-background text-[10px]"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onBlur={(e) => handleUpdateBudget(item, subcat, e.target.value, 'percent')}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudget(item, subcat, e.currentTarget.value, 'percent')}
                            />
                          ) : (
                            <div
                              className="cursor-pointer hover:text-blue-500 rounded inline-flex items-center hover:bg-accent transition-all px-2 py-1"
                              onClick={(e) => { e.stopPropagation(); setEditingBudget(percentKey); }}
                            >
                              {totalIncome > 0 ? `${Math.round(((subcat.budget_amount || 0) / totalIncome) * 100)}%` : '0%'}
                            </div>
                          )}
                        </td>
                      </>
                    )}
                    <td className="py-2 px-6 text-right font-bold text-foreground/70">{formatCurrency(subcat.spent, settings.currency)}</td>
                    <td className="py-2 px-6 text-right font-mono">
                      {formatCurrency(0 - (subcat.spent || 0), settings.currency)}
                    </td>
                  </tr>
                );
              });
            };

            return (
              <React.Fragment key={item.name || 'unknown'}>
                <tr
                  className={`transition-colors group cursor-pointer border-b border-border/50 ${type === 'income' ? 'hover:bg-emerald-500/5' : type === 'klintemarken' ? 'hover:bg-blue-500/5' : type === 'special' ? 'hover:bg-purple-500/5' : 'hover:bg-rose-500/5'}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('td')?.querySelector('input, div[role="spinbutton"]')) {
                      return;
                    }
                    toggleCategory(item.name);
                  }}
                >
                  <td className="py-3 px-6 pl-8">
                    {item.sub_categories.length > 0 && (
                      isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="py-3 px-2 font-bold text-foreground">{item.name}</td>
                  {type !== 'income' && (
                    <>
                      <td className="py-3 px-3 text-right font-medium text-muted-foreground">
                        {formatCurrency(item.budget_amount * 12, settings.currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-muted-foreground">
                        {formatCurrency(item.budget_amount, settings.currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-muted-foreground">
                        {totalIncome > 0 ? `${Math.round((item.budget_amount / totalIncome) * 100)}%` : '0%'}
                      </td>
                    </>
                  )}
                  <td className="py-3 px-6 text-right font-mono text-muted-foreground italic text-[11px]">-</td>
                  <td className="py-3 px-6 text-right font-black text-foreground">{formatCurrency(item.spent, settings.currency)}</td>
                  <td className={`py-3 px-6 text-right font-bold ${item.remaining >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(item.remaining, settings.currency)}
                    {item.budget_amount > 0 && (
                      <span className="ml-2 text-[10px] font-bold opacity-60 w-12 inline-block">
                        ({Math.round((item.spent / item.budget_amount) * 100)}%)
                      </span>
                    )}
                  </td>
                </tr>
                {renderSubCategories()}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Year Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Annual Budget for {selectedYear}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Monthly Contribution: {formatCurrency(monthlyContribution)}</span>
            <span className="text-xs">({formatCurrency(budget?.total_budget || 0)} annually)</span>
          </div>
        </div>
        
        {/* Year Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateYear('prev')}
            disabled={selectedYear <= minYear}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="px-3 py-1 border rounded text-sm"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateYear('next')}
            disabled={selectedYear >= maxYear}
            className="h-8 w-8 p-0"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-t-4 border-t-blue-500 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">Planned Budget ({selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(budget?.total_budget || 0)}</div>
              <div className="text-sm text-gray-500">{formatCurrency(monthlyContribution)} monthly</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-rose-500 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">Actual Spend YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-rose-600">{formatCurrency(budget?.total_spent || 0)}</div>
              <div className="text-sm text-gray-500">{formatCurrency((budget?.total_spent || 0) / 12)} monthly avg</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-emerald-500 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">Remaining Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(budget?.total_remaining || 0)}</div>
              <div className="text-sm text-gray-500">{formatCurrency((budget?.total_remaining || 0) / 12)} monthly remaining</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={viewMode} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 p-1 bg-muted/50 rounded-2xl border border-border/50 shadow-sm">
            <TabsTrigger value="table" className="rounded-xl flex items-center gap-2 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              <Table className="w-4 h-4" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="sankey" className="rounded-xl flex items-center gap-2 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              <Network className="w-4 h-4" />
              Sankey View
            </TabsTrigger>
          </TabsList>
        </div>
          <TabsContent value="table" className="space-y-6 mt-0 animate-in fade-in duration-500">
          {/* Income Section */}
          {incomeData.length > 0 && (
            <Card className="shadow-sm border-emerald-100 bg-emerald-50/10 overflow-hidden rounded-3xl">
              <div className="bg-emerald-50/50 border-b border-emerald-100 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-xl text-emerald-800 flex items-center gap-2 font-bold">
                  Income Sources
                </CardTitle>
              </div>
              <CardContent className="p-0">
                <BudgetTable data={incomeData} type="income" />
              </CardContent>
            </Card>
          )}

          {/* Expenditure Section */}
          {expenditureData.length > 0 && (
            <Card className="shadow-sm border-rose-100 bg-rose-50/10 overflow-hidden rounded-3xl">
              <div className="bg-rose-50/50 border-b border-rose-100 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-xl text-rose-800 flex items-center gap-2 font-bold">
                  Primary Expenses
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => expandAll(expenditureData.map(d => d.name))}
                    className="h-8 text-[10px] uppercase tracking-wider font-bold"
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                    className="h-8 text-[10px] uppercase tracking-wider font-bold"
                  >
                    Collapse All
                  </Button>
                </div>
              </div>
              <CardContent className="p-0">
                <BudgetTable data={expenditureData} type="expense" />
              </CardContent>
            </Card>
          )}

          {/* Klintemarken Section */}
          {klintemarkenData.length > 0 && (
            <Card className="shadow-sm border-blue-100 bg-blue-50/10 overflow-hidden rounded-3xl">
              <div className="bg-blue-50/50 border-b border-blue-100 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-xl text-blue-800 flex items-center gap-2 font-bold">
                  Klintemarken Property
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => expandAll(klintemarkenData.map(d => d.name))}
                    className="h-8 text-[10px] uppercase tracking-wider font-bold"
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                    className="h-8 text-[10px] uppercase tracking-wider font-bold"
                  >
                    Collapse All
                  </Button>
                </div>
              </div>
              <CardContent className="p-0">
                <BudgetTable data={klintemarkenData} type="klintemarken" />
              </CardContent>
            </Card>
          )}

          {/* Special Section */}
          {specialData.length > 0 && (
            <Card className="shadow-sm border-purple-100 bg-purple-50/10 overflow-hidden rounded-3xl">
              <div className="bg-purple-50/50 border-b border-purple-100 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-xl text-purple-800 flex items-center gap-2 font-bold">
                  Special Items
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => expandAll(specialData.map(d => d.name))}
                    className="h-8 text-[10px] uppercase tracking-wider font-bold"
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                    className="h-8 text-[10px] uppercase tracking-wider font-bold"
                  >
                    Collapse All
                  </Button>
                </div>
              </div>
              <CardContent className="p-0">
                <BudgetTable data={specialData} type="special" />
              </CardContent>
            </Card>
          )}
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
      </Tabs>
    </div>
  );
};

export default Budget;
