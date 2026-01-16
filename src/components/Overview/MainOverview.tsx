
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart } from 'recharts';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod, getPeriodInterval } from '@/lib/dateUtils';
import { format, parseISO, startOfMonth, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { da } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const MainOverview = () => {
  const { transactions } = useTransactionTable();
  const { selectedPeriod } = usePeriod();
  const [includeSpecial, setIncludeSpecial] = useState(false);
  const [includeKlintemarken, setIncludeKlintemarken] = useState(false);

  const periodFiltered = useMemo(() => {
    const interval = getPeriodInterval(selectedPeriod);
    // Need target year to check budgetYear match
    const targetYear = interval.start.getFullYear().toString();

    let filtered = transactions.filter(t => {
      // Priority 1: Budget Year matches the *Year* of the selected period
      if (t.budgetYear) {
        if (t.budgetYear !== targetYear) return false;
        // If year matches, we still need to check if it falls within the period (e.g. "This Quarter")
        // If the period is "This Year", we are good.
        // If the period is "This Month", we need to check the month from the date? 
        // Assuming budgetYear is for "Yearly attribution" mostly.
        // IF budgetYear is set, we treat it as belonging to that year.
        // For smaller granularities (Month/Quarter), we should probably still respect the date's month unless overridden.
        // For now, let's assume valid for the year.

        // However, the Overview is often specific to a Month. 
        // If I say "Budget Year: 2024" but date is "2023-12-31" (paying early), does it show in "Jan 2024"?
        // Probably yes, if we view "This Year". 
        // If we view "Jan 2024", does it show? 
        // Strict logic: budgetYear overrides Year component of date. Month component is kept from date.
        try {
          const d = parseISO(t.date);
          // Construct effective date: Use budgetYear, but keep month/day from transaction
          const effectiveDate = new Date(parseInt(t.budgetYear), d.getMonth(), d.getDate());
          return isWithinInterval(effectiveDate, interval);
        } catch {
          return false;
        }
      }

      // Priority 2: Standard Date check
      return filterByPeriod([t], selectedPeriod).length > 0;
    });

    if (!includeSpecial) {
      filtered = filtered.filter(t => t.budget !== 'Special');
    }
    if (!includeKlintemarken) {
      filtered = filtered.filter(t => t.budget !== 'Klintemarken');
    }

    filtered = filtered.filter(t => t.budget !== 'Exclude');
    return filtered;
  }, [transactions, selectedPeriod, includeSpecial, includeKlintemarken]);

  const summary = useMemo(() => {
    return periodFiltered.reduce((acc, t) => {
      if (t.amount > 0) acc.income += t.amount;
      else acc.expense += Math.abs(t.amount);
      return acc;
    }, { income: 0, expense: 0 });
  }, [periodFiltered]);

  const netIncome = summary.income - summary.expense;

  const monthlyData = useMemo(() => {
    const interval = getPeriodInterval(selectedPeriod);
    const months = eachMonthOfInterval(interval);

    return months.map(monthDate => {
      const monthLabel = format(monthDate, 'MMM', { locale: da });
      const monthStart = startOfMonth(monthDate);
      const nextMonthStart = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

      const monthTransactions = transactions.filter(t => {
        const d = parseISO(t.date);
        return d >= monthStart && d < nextMonthStart;
      });

      const income = monthTransactions.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);
      const expense = monthTransactions.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

      return {
        month: monthLabel,
        income,
        expense,
        balance: income - expense
      };
    });
  }, [transactions, selectedPeriod]);

  const balanceTrend = useMemo(() => {
    let runningBalance = 0;
    return monthlyData.map(d => {
      runningBalance += d.balance;
      return { ...d, cumulativeBalance: runningBalance };
    });
  }, [monthlyData]);

  const radarData = useMemo(() => {
    const categories: Record<string, { actual: number; budgeted: number }> = {};

    periodFiltered.forEach(t => {
      const cat = t.category || 'Other';
      if (!categories[cat]) categories[cat] = { actual: 0, budgeted: 2000 };
      categories[cat].actual += Math.abs(t.amount < 0 ? t.amount : 0);
    });

    return Object.entries(categories).map(([category, vals]) => ({
      category,
      budgeted: vals.budgeted,
      actual: Math.round(vals.actual)
    }));
  }, [periodFiltered]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">{selectedPeriod} Overview</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch id="include-special" checked={includeSpecial} onCheckedChange={setIncludeSpecial} />
              <Label htmlFor="include-special" className="text-sm font-medium text-gray-600">Include Special</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="include-klintemarken" checked={includeKlintemarken} onCheckedChange={setIncludeKlintemarken} />
              <Label htmlFor="include-klintemarken" className="text-sm font-medium text-gray-600">Include Klintemarken</Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {summary.income.toLocaleString('da-DK', { minimumFractionDigits: 0 })} <span className="text-sm font-normal text-emerald-500 ml-1">DKK</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-rose-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-rose-600">
                {summary.expense.toLocaleString('da-DK', { minimumFractionDigits: 0 })} <span className="text-sm font-normal text-rose-500 ml-1">DKK</span>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border-l-4 shadow-sm", netIncome >= 0 ? "border-l-blue-500" : "border-l-amber-500")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Net Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", netIncome >= 0 ? "text-blue-600" : "text-amber-600")}>
                {netIncome.toLocaleString('da-DK', { minimumFractionDigits: 0 })} <span className="text-sm font-normal ml-1 opacity-70">DKK</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Cash Flow Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={balanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="expense" fill="#f43f5e" name="Expense" radius={[4, 4, 0, 0]} barSize={30} />
                    <Line type="monotone" dataKey="cumulativeBalance" stroke="#3b82f6" strokeWidth={3} name="Cumulative" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <PolarRadiusAxis axisLine={false} tick={false} />
                    <Radar name="Spent" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {radarData.sort((a, b) => b.actual - a.actual).map((item, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <div className="flex flex-col flex-1 mr-4">
                      <span className="font-semibold text-slate-700">{item.category}</span>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (item.actual / (summary.expense || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 whitespace-nowrap">{item.actual.toLocaleString()} DKK</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {((item.actual / (summary.expense || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
                {radarData.length === 0 && (
                  <div className="text-center py-10 text-slate-400 italic">No expense data for this period</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
