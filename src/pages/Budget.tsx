import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings as SettingsIcon, ChevronDown, ChevronRight } from 'lucide-react';
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

const Budget = () => {
  const { transactions } = useTransactionTable();
  const { settings, updateCategoryBudget } = useSettings();
  const { selectedPeriod, customDateRange } = usePeriod();
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'sankey'>('table');

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const subToCatMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(settings.subCategories).forEach(([cat, subs]) => {
      subs.forEach(sub => map[sub] = cat);
    });
    return map;
  }, [settings.subCategories]);

  const resolveCategory = (t: any) => {
    if (t.category && settings.categories.includes(t.category)) return t.category;
    if (t.subCategory && subToCatMap[t.subCategory]) return subToCatMap[t.subCategory];
    return t.category || 'Other';
  };

  const periodTransactions = useMemo(() => {
    const activeTransactions = transactions.filter(t => !t.excluded && t.budget !== 'Exclude');
    return filterByPeriod(activeTransactions, selectedPeriod, customDateRange);
  }, [transactions, selectedPeriod, customDateRange]);

  // Calculate Reference Income for % calculations
  const referenceIncome = useMemo(() => {
    const incBudget = settings.categoryBudgets['Income'];
    if (typeof incBudget === 'number') return incBudget;
    if (typeof incBudget === 'string' && !incBudget.includes('%')) return parseFloat(incBudget);
    return 0;
  }, [settings.categoryBudgets]);

  const parseBudget = (val: string | number | undefined, base: number) => {
    if (val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      if (val.includes('%')) {
        const pct = parseFloat(val.replace('%', ''));
        return (pct / 100) * base;
      }
      return parseFloat(val) || 0;
    }
    return 0;
  };

  const budgetData = useMemo(() => {
    const categories = settings.categories;
    const spentMap: Record<string, { period: number; ytd: number; year: number; subcats: Record<string, number> }> = {};

    categories.forEach(cat => {
      spentMap[cat] = { period: 0, ytd: 0, year: 0, subcats: {} };
    });
    if (!spentMap['Other']) spentMap['Other'] = { period: 0, ytd: 0, year: 0, subcats: {} };

    periodTransactions.forEach(t => {
      const cat = resolveCategory(t);
      const sub = t.subCategory || 'Other';

      const isExpense = t.amount < 0;
      const isIncomeCategory = cat === 'Income';

      let amountToTrack = 0;
      if (isIncomeCategory) {
        if (t.amount > 0) amountToTrack = t.amount;
      } else {
        if (isExpense) amountToTrack = Math.abs(t.amount);
      }

      if (amountToTrack > 0) {
        const targetCat = spentMap[cat] ? cat : 'Other';
        spentMap[targetCat].period += amountToTrack;
        spentMap[targetCat].subcats[sub] = (spentMap[targetCat].subcats[sub] || 0) + amountToTrack;
      }
    });

    // Handle Custom Period Scale
    let monthsInPeriod = 12;
    if (selectedPeriod === 'Custom' && customDateRange?.from && customDateRange?.to) {
      const diffTime = Math.abs(customDateRange.to.getTime() - customDateRange.from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      monthsInPeriod = diffDays / 30.44; // approx
      if (monthsInPeriod < 0.1) monthsInPeriod = 0.1; // fallback
    } else {
      const periodInterval = getPeriodInterval(selectedPeriod, customDateRange);
      try {
        monthsInPeriod = eachMonthOfInterval({ start: periodInterval.start, end: periodInterval.end }).length;
      } catch (e) {
        console.error("Invalid interval for months calculation", e);
        monthsInPeriod = 1;
      }
    }

    return Object.entries(spentMap).map(([category, data]) => {
      const rawBudget = settings.categoryBudgets[category];
      const monthlyBudget = parseBudget(rawBudget, referenceIncome);
      const periodBudget = monthlyBudget * monthsInPeriod;

      const subcategories = Object.entries(data.subcats).map(([name, spent]) => {
        const rawSubBudget = settings.subCategoryBudgets?.[category]?.[name];
        let subPeriodBudget = 0;
        if (rawSubBudget !== undefined) {
          if (typeof rawSubBudget === 'string' && rawSubBudget.includes('%')) {
            const pct = parseFloat(rawSubBudget.replace('%', ''));
            subPeriodBudget = (pct / 100) * periodBudget;
          } else {
            subPeriodBudget = parseBudget(rawSubBudget, referenceIncome) * monthsInPeriod;
          }
        }

        return {
          name,
          spent,
          periodBudget: subPeriodBudget,
          monthlyBudget: subPeriodBudget / monthsInPeriod
        };
      });

      // Add missing subcategories from settings with 0 spent
      const definedSubs = settings.subCategories[category] || [];
      definedSubs.forEach(subName => {
        if (!subcategories.find(s => s.name === subName)) {
          const rawSubBudget = settings.subCategoryBudgets?.[category]?.[subName];
          let subPeriodBudget = 0;
          if (rawSubBudget !== undefined) {
            if (typeof rawSubBudget === 'string' && rawSubBudget.includes('%')) {
              const pct = parseFloat(rawSubBudget.replace('%', ''));
              subPeriodBudget = (pct / 100) * periodBudget;
            } else {
              subPeriodBudget = parseBudget(rawSubBudget, referenceIncome) * monthsInPeriod;
            }
          }
          subcategories.push({
            name: subName,
            spent: 0,
            periodBudget: subPeriodBudget,
            monthlyBudget: subPeriodBudget / monthsInPeriod
          });
        }
      });

      subcategories.sort((a, b) => {
        const order = settings.subCategories[category] || [];
        const idxA = order.indexOf(a.name);
        const idxB = order.indexOf(b.name);
        return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
      });

      const remaining = periodBudget - data.period;
      const remainingPercent = periodBudget > 0 ? (remaining / periodBudget) * 100 : 0;

      return {
        category,
        monthlyBudget,
        periodBudget,
        spent: data.period,
        remaining,
        remainingPercent,
        subcategories
      };
    }).sort((a, b) => {
      // Sort by settings order
      const idxA = settings.categories.indexOf(a.category);
      const idxB = settings.categories.indexOf(b.category);
      const safeA = idxA === -1 ? 9999 : idxA;
      const safeB = idxB === -1 ? 9999 : idxB;
      return safeA - safeB;
    });
  }, [periodTransactions, settings, selectedPeriod, subToCatMap, referenceIncome, customDateRange]);

  const totalPeriodBudget = budgetData.reduce((sum, item) => sum + item.periodBudget, 0);
  const totalSpent = budgetData.reduce((sum, item) => sum + item.spent, 0);
  const totalRemaining = totalPeriodBudget - totalSpent;

  // Placeholder for Projected Income
  const projectedIncome = "{pending code}";

  const expandAll = (categories: string[]) => {
    setExpandedCategories(new Set(categories));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Split Data
  const incomeData = budgetData.filter(item => item.category === 'Income');
  const expenseData = budgetData.filter(item => item.category !== 'Income');

  const totalExpenseBudget = useMemo(() => expenseData.reduce((sum, item) => sum + item.periodBudget, 0), [expenseData]);

  const handleUpdateBudget = (category: string, value: string) => {
    if (value.includes('%')) {
      updateCategoryBudget(category, value);
    } else {
      const amount = parseFloat(value);
      updateCategoryBudget(category, isNaN(amount) ? 0 : amount);
    }
    setEditingBudget(null);
  };

  const BudgetTable = ({ data, type }: { data: typeof budgetData, type: 'income' | 'expense' }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className={`${type === 'income'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'} border-b uppercase text-[10px] font-bold tracking-widest`}>
            <th className="py-3 px-6 w-8"></th>
            <th className="py-3 px-2">Category</th>
            {type === 'expense' && <th className="py-3 px-6 text-right">Budget</th>}
            <th className="py-3 px-6 text-right">Projected</th>
            <th className="py-3 px-6 text-right">{type === 'expense' ? 'Expenses' : 'Actual'}</th>
            <th className="py-3 px-6 text-right">Vs Budget</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${type === 'income' ? 'divide-emerald-500/10' : 'divide-rose-500/10'}`}>
          {data.map((item) => {
            const isExpanded = expandedCategories.has(item.category);
            const isEditing = editingBudget === item.category;
            const rawBudget = settings.categoryBudgets[item.category];

            return (
              <React.Fragment key={item.category}>
                <tr
                  className={`transition-colors group cursor-pointer border-b border-border/50 ${type === 'income' ? 'hover:bg-emerald-500/5' : 'hover:bg-rose-500/5'}`}
                  onClick={() => toggleCategory(item.category)}
                >
                  <td className="py-3 px-6 pl-8">
                    {item.subcategories.length > 0 && (
                      isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="py-3 px-2 font-bold text-foreground">{item.category}</td>
                  {type === 'expense' && (
                    <td className="py-3 px-6 text-right font-medium text-muted-foreground">
                      {(selectedPeriod === 'This month' || selectedPeriod === 'Last Month') ? (
                        isEditing ? (
                          <Input
                            defaultValue={rawBudget}
                            className="w-24 h-8 text-right ml-auto bg-background"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => handleUpdateBudget(item.category, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudget(item.category, e.currentTarget.value)}
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:text-blue-500 rounded inline-flex items-center hover:bg-accent transition-all px-2 py-1"
                            onClick={(e) => { e.stopPropagation(); setEditingBudget(item.category); }}
                          >
                            {formatCurrency(item.periodBudget, settings.currency)}
                            {settings.categoryBudgets[item.category]?.toString().includes('%') && <span className="text-[10px] text-muted-foreground ml-1">({settings.categoryBudgets[item.category]})</span>}
                            {totalExpenseBudget > 0 && (
                              <span className="ml-2 text-[10px] font-bold opacity-40">({Math.round((item.periodBudget / totalExpenseBudget) * 100)}%)</span>
                            )}
                          </div>
                        )
                      ) : (
                        <>
                          {formatCurrency(item.periodBudget, settings.currency)}
                          {settings.categoryBudgets[item.category]?.toString().includes('%') && <span className="text-[10px] text-muted-foreground ml-1">({settings.categoryBudgets[item.category]})</span>}
                          {totalExpenseBudget > 0 && (
                            <span className="ml-2 text-[10px] font-bold opacity-40">({Math.round((item.periodBudget / totalExpenseBudget) * 100)}%)</span>
                          )}
                        </>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-6 text-right font-mono text-muted-foreground italic text-[11px]">{projectedIncome}</td>
                  <td className="py-3 px-6 text-right font-black text-foreground">{formatCurrency(item.spent, settings.currency)}</td>
                  <td className={`py-3 px-6 text-right font-bold ${item.remaining >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(item.remaining, settings.currency)}
                    {item.periodBudget > 0 && (
                      <span className="ml-2 text-[10px] font-bold opacity-60 w-12 inline-block">
                        ({Math.round((item.spent / item.periodBudget) * 100)}%)
                      </span>
                    )}
                  </td>
                </tr>
                {isExpanded && item.subcategories.map((subcat, subIndex) => (
                  <tr key={`${item.category}-${subIndex}`} className={`text-[11px] text-muted-foreground/80 ${type === 'income' ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                    <td className="py-2 px-6"></td>
                    <td className="py-2 px-2 italic pl-6 font-medium">└ {subcat.name}</td>
                    {type === 'expense' && (
                      <td className="py-2 px-6 text-right font-mono opacity-80">
                        {subcat.periodBudget > 0 ? formatCurrency(subcat.periodBudget, settings.currency) : '-'}
                      </td>
                    )}
                    <td className="py-2 px-6 text-right font-mono text-muted-foreground/60 italic text-[10px]">{projectedIncome}</td>
                    <td className="py-2 px-6 text-right font-bold text-foreground/70">{formatCurrency(subcat.spent, settings.currency)}</td>
                    <td className="py-2 px-6 text-right font-mono">
                      {subcat.periodBudget > 0 ? (
                        <div className="flex flex-col items-end">
                          <span>{formatCurrency(subcat.periodBudget - subcat.spent, settings.currency)}</span>
                          <span className="text-[9px] opacity-60">({Math.round((subcat.spent / subcat.periodBudget) * 100)}%)</span>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Budget Analysis</h1>
          <p className="text-sm text-gray-500 font-medium">Tracking {selectedPeriod === 'Custom' ? 'Custom Period' : selectedPeriod.toLowerCase()} spending</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector />
          <Button variant="outline" size="sm" asChild className="shadow-sm">
            <Link to="/settings">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Configure Budget
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-t-4 border-t-blue-500 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">Planned Budget ({selectedPeriod === 'Custom' ? 'Custom' : selectedPeriod})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">
              {formatCurrency(totalPeriodBudget, settings.currency)} <span className="text-sm font-normal opacity-70">{settings.currency}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-slate-800 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">
              {formatCurrency(totalSpent, settings.currency)} <span className="text-sm font-normal opacity-70">{settings.currency}</span>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-t-4 shadow-md ${totalRemaining >= 0 ? 'border-t-emerald-500' : 'border-t-rose-500'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">Budget Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${totalRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(totalRemaining, settings.currency)} <span className="text-sm font-normal opacity-70">{settings.currency}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="table" value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'sankey')} className="w-full">
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

          {/* Expenses Section */}
          <Card className="shadow-sm border-rose-100 bg-rose-50/10 overflow-hidden rounded-3xl">
            <div className="bg-rose-50/50 border-b border-rose-100 py-4 px-6 flex justify-between items-center">
              <CardTitle className="text-xl text-rose-800 flex items-center gap-2 font-bold">
                Expenses & Spending
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => expandAll(expenseData.map(d => d.category))}
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
              <BudgetTable data={expenseData} type="expense" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sankey" className="mt-0 animate-in zoom-in-95 fade-in duration-500">
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center px-4">
              <h2 className="text-xl font-bold text-foreground mb-1">Financial Cash Flow</h2>
              <p className="text-sm text-muted-foreground max-w-md">Visualizing the flow of money from income sources through total funds and into expense categories.</p>
            </div>
            <BudgetSankey budgetData={budgetData} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Budget;
