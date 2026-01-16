
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings as SettingsIcon, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod, getPeriodInterval } from '@/lib/dateUtils';
import { startOfYear, eachMonthOfInterval, isWithinInterval, parseISO, endOfYear } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Budget = () => {
  const { transactions } = useTransactionTable();
  const { settings, updateCategoryBudget } = useSettings();
  const { selectedPeriod, setSelectedPeriod } = usePeriod();
  const [editingBudget, setEditingBudget] = useState<string | null>(null);

  // 1. Filter transactions for the selected period (for "Actual Spend" card)
  const periodTransactions = useMemo(() => {
    return filterByPeriod(transactions, selectedPeriod);
  }, [transactions, selectedPeriod]);

  // 2. Filter transactions for the entire year of the selected period
  const yearTransactions = useMemo(() => {
    const interval = getPeriodInterval(selectedPeriod);
    const yrStart = startOfYear(interval.start);
    const yrEnd = endOfYear(interval.start);
    const targetYear = yrStart.getFullYear().toString();
    const yearInterval = { start: yrStart, end: yrEnd };

    return transactions.filter(t => {
      // Priority 1: Budget Year explicit attribution
      if (t.budgetYear) {
        return t.budgetYear === targetYear;
      }
      // Priority 2: Transaction Date
      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, yearInterval);
      } catch { return false; }
    });
  }, [transactions, selectedPeriod]);

  // Calculate YTD as well for comparison
  const ytdTransactions = useMemo(() => {
    const periodInterval = getPeriodInterval(selectedPeriod);
    const targetYear = periodInterval.start.getFullYear().toString();
    // YTD is from start of year to end of selected period
    const interval = { start: startOfYear(periodInterval.start), end: periodInterval.end };
    return transactions.filter(t => {
      // If budgetYear is set, strict check on year, but we still need month check for YTD?
      // Actually YTD usually implies "Up to this point in time". 
      // If a transaction is attributed to 2024 via budgetYear, it should appear in 2024 YTD.
      // But we need to know if it falls within the *period's* range (e.g. Jan-Mar).
      // For simplicity in this logic: If budgetYear matches targetYear, we consider it part of the year.
      // Ideally we'd need a "budgetMonth" too for perfect YTD, but for now let's rely on date for "month" precision unless budgetYear overrides.

      // Override logic: If budgetYear is present and matches the current year we are looking at:
      if (t.budgetYear) {
        if (t.budgetYear !== targetYear) return false;
        // It matches the year, but is it before the end of the period? 
        // without budgetMonth, we assume it's valid for the year, but maybe risky for "YTD" if it's a future dated thing?
        // Let's fallback to date for month comparison even if year is overridden.
        try {
          const d = parseISO(t.date);
          // We only care if it's before the end date
          return d <= interval.end;
        } catch { return true; } // If date invalid but budgetYear matches, include it? Safer to include.
      }

      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, interval);
      } catch { return false; }
    });
  }, [transactions, selectedPeriod]);

  // 3. Calculate spent per category
  const budgetData = useMemo(() => {
    const categories = settings.categories;
    const spentMap: Record<string, { period: number; ytd: number; year: number; subcats: Record<string, number> }> = {};

    categories.forEach(cat => {
      spentMap[cat] = { period: 0, ytd: 0, year: 0, subcats: {} };
    });
    if (!spentMap['Other']) spentMap['Other'] = { period: 0, ytd: 0, year: 0, subcats: {} };

    // Process Period Transactions
    periodTransactions.forEach(t => {
      const cat = t.category || 'Other';
      const sub = t.subCategory || 'Other';
      if (t.amount < 0) {
        const absAmount = Math.abs(t.amount);
        if (!spentMap[cat]) spentMap[cat] = { period: 0, ytd: 0, year: 0, subcats: {} };
        spentMap[cat].period += absAmount;
        spentMap[cat].subcats[sub] = (spentMap[cat].subcats[sub] || 0) + absAmount;
      }
    });

    // Process Year Transactions
    yearTransactions.forEach(t => {
      const cat = t.category || 'Other';
      if (t.amount < 0) {
        if (spentMap[cat]) spentMap[cat].year += Math.abs(t.amount);
      }
    });

    // Process YTD Transactions (for the column)
    ytdTransactions.forEach(t => {
      const cat = t.category || 'Other';
      if (t.amount < 0) {
        if (spentMap[cat]) spentMap[cat].ytd += Math.abs(t.amount);
      }
    });

    const totalBudget = Object.values(settings.categoryBudgets).reduce((a, b) => a + b, 0);

    return Object.entries(spentMap).map(([category, data]) => {
      const budget = settings.categoryBudgets[category] || 0;
      const allocation = totalBudget > 0 ? (budget / totalBudget) * 100 : 0;

      const periodInterval = getPeriodInterval(selectedPeriod);
      const monthsYTD = eachMonthOfInterval({ start: startOfYear(periodInterval.start), end: periodInterval.end }).length;
      const budgetYTD = budget * monthsYTD;

      return {
        category,
        budget,
        allocation: parseFloat(allocation.toFixed(1)),
        spent: data.period,
        budgetYTD,
        vsBudget: data.period - budget,
        vsYTD: data.ytd - budgetYTD,
        subcategories: Object.entries(data.subcats).map(([name, spent]) => ({
          name,
          budget: 0,
          spent
        }))
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [periodTransactions, ytdTransactions, yearTransactions, settings, selectedPeriod]);

  const totalBudget = budgetData.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = budgetData.reduce((sum, item) => sum + item.spent, 0);
  const totalDelta = totalSpent - totalBudget;

  const handleUpdateBudget = (category: string, value: string) => {
    const amount = parseFloat(value) || 0;
    updateCategoryBudget(category, amount);
    setEditingBudget(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Budget Analysis</h1>
          <p className="text-sm text-gray-500 font-medium">Tracking {selectedPeriod.toLowerCase()} spending</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48 bg-white shadow-sm border-gray-200">
              <Calendar className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="This month">This month</SelectItem>
              <SelectItem value="Last Month">Last Month</SelectItem>
              <SelectItem value="This Quarter">This Quarter</SelectItem>
              <SelectItem value="Last Quarter">Last Quarter</SelectItem>
              <SelectItem value="This Year">This Year</SelectItem>
              <SelectItem value="Last Year">Last Year</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" asChild className="shadow-sm">
            <Link to="/settings">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Category Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-t-4 border-t-blue-500 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">Planned Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">
              {totalBudget.toLocaleString('da-DK')} <span className="text-sm font-normal opacity-70">DKK</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-slate-800 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">Actual Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">
              {totalSpent.toLocaleString('da-DK')} <span className="text-sm font-normal opacity-70">DKK</span>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-t-4 shadow-md ${totalDelta <= 0 ? 'border-t-emerald-500' : 'border-t-rose-500'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${totalDelta <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {(-totalDelta).toLocaleString('da-DK')} <span className="text-sm font-normal opacity-70">DKK</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-none overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 p-6">
          <CardTitle className="text-xl">Budget vs Actual by Category</CardTitle>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-4 px-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Category</th>
                  <th className="py-4 px-6 text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">Budget</th>
                  <th className="py-4 px-6 text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">Allocation</th>
                  <th className="py-4 px-6 text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">Spent</th>
                  <th className="py-4 px-6 text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">Vs Budget</th>
                  <th className="py-4 px-6 text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">Vs YTD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {budgetData.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6 font-bold text-slate-800">{item.category}</td>
                      <td className="py-4 px-6 text-right">
                        {editingBudget === item.category ? (
                          <Input
                            type="number"
                            defaultValue={item.budget}
                            className="w-24 h-8 text-right ml-auto bg-white"
                            autoFocus
                            onBlur={(e) => handleUpdateBudget(item.category, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateBudget(item.category, e.currentTarget.value)}
                          />
                        ) : (
                          <div
                            className="cursor-pointer font-bold text-slate-600 hover:text-blue-600 px-2 py-1 rounded inline-flex items-center group-hover:bg-slate-100 transition-all"
                            onClick={() => setEditingBudget(item.category)}
                          >
                            {item.budget.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right text-slate-400 font-medium text-sm">{item.allocation}%</td>
                      <td className="py-4 px-6 text-right font-black text-slate-900">{item.spent.toLocaleString()}</td>
                      <td className={`py-4 px-6 text-right font-bold ${item.vsBudget <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {item.vsBudget > 0 ? '+' : ''}{item.vsBudget.toLocaleString()}
                      </td>
                      <td className={`py-4 px-6 text-right font-medium text-sm ${item.vsYTD <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.vsYTD > 0 ? '+' : ''}{item.vsYTD.toLocaleString()}
                      </td>
                    </tr>
                    {item.subcategories.map((subcat, subIndex) => (
                      <tr key={`${index}-${subIndex}`} className="bg-slate-50/30 text-xs text-slate-500">
                        <td className="py-2.5 px-10 italic">└ {subcat.name}</td>
                        <td className="py-2.5 px-6 text-right">-</td>
                        <td className="py-2.5 px-6 text-right">-</td>
                        <td className="py-2.5 px-6 text-right font-semibold">{subcat.spent.toLocaleString()}</td>
                        <td className="py-2.5 px-6 text-right">-</td>
                        <td className="py-2.5 px-6 text-right">-</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Budget;
import React from 'react';
