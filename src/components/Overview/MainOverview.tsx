import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Area, ReferenceLine, Legend } from 'recharts';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod, getPeriodInterval } from '@/lib/dateUtils';
import { format, parseISO, startOfMonth, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { da } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import { useAnnualBudget } from '@/hooks/useAnnualBudget';

export const MainOverview = () => {
  const { transactions } = useTransactionTable();
  const { settings } = useSettings();
  const { selectedPeriod, customDateRange } = usePeriod();
  const [includeSpecial, setIncludeSpecial] = useState(true);
  const [includeKlintemarken, setIncludeKlintemarken] = useState(true);

  const currentYear = useMemo(() => {
    if (/^\d{4}$/.test(selectedPeriod)) return parseInt(selectedPeriod);

    const interval = getPeriodInterval(selectedPeriod, customDateRange);
    const startYear = interval.start.getFullYear();
    const endYear = interval.end.getFullYear();

    // If it's a wide range (like 'All') or very old, default to current year for budget mapping
    if (startYear < 2022 || startYear !== endYear) return new Date().getFullYear();

    return startYear;
  }, [selectedPeriod, customDateRange]);

  const { budget: budgetData, loading: budgetLoading } = useAnnualBudget(currentYear);

  const periodFiltered = useMemo(() => {
    const interval = getPeriodInterval(selectedPeriod, customDateRange);
    const targetYearStr = currentYear.toString();

    let filtered = transactions.filter(t => {
      // Handle budgetYear logic for standard years
      // Ensure we compare strings to avoid type mismatch (e.g. 2025 !== "2025")
      if (t.budgetYear && selectedPeriod !== 'Custom' && selectedPeriod !== 'All') {
        if (t.budgetYear.toString() !== targetYearStr) return false;
        try {
          const d = parseISO(t.date);
          const effectiveDate = new Date(parseInt(t.budgetYear.toString()), d.getMonth(), d.getDate());
          return isWithinInterval(effectiveDate, interval);
        } catch {
          return false;
        }
      }

      return filterByPeriod([t], selectedPeriod, customDateRange).length > 0;
    });

    if (!includeSpecial) filtered = filtered.filter(t => t.budget !== 'Special');
    if (!includeKlintemarken) filtered = filtered.filter(t => t.budget !== 'Klintemarken');
    filtered = filtered.filter(t => t.budget !== 'Exclude' && !t.excluded && t.status !== 'Pending Reconciliation' && !t.status?.startsWith('Pending: '));
    return filtered;
  }, [transactions, selectedPeriod, customDateRange, includeSpecial, includeKlintemarken, currentYear]);

  const summary = useMemo(() => {
    return periodFiltered.reduce((acc, t) => {
      if (t.amount > 0) acc.income += t.amount;
      else acc.expense += Math.abs(t.amount);
      return acc;
    }, { income: 0, expense: 0 });
  }, [periodFiltered]);

  const netIncome = summary.income - summary.expense;

  const chartColors = useMemo(() => ({
    grid: settings.darkMode ? '#1e293b' : '#f0f0f0',
    text: settings.darkMode ? '#94a3b8' : '#64748b',
    tooltip: settings.darkMode ? '#0f172a' : '#fff',
    radarGrid: settings.darkMode ? '#334155' : '#e2e8f0',
  }), [settings.darkMode]);

  const monthlyData = useMemo(() => {
    const interval = getPeriodInterval(selectedPeriod, customDateRange);
    const months = eachMonthOfInterval(interval);

    return months.map(monthDate => {
      const monthLabel = format(monthDate, 'MM/yy', { locale: da });
      const fullMonthName = format(monthDate, 'MM/yyyy', { locale: da });
      const monthStart = startOfMonth(monthDate);
      const nextMonthStart = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

      const monthTransactions = transactions.filter(t => {
        const d = parseISO(t.date);
        const isInMonth = d >= monthStart && d < nextMonthStart;
        const isNotExcluded = t.budget !== 'Exclude' && !t.excluded;
        const isSpecialAllowed = includeSpecial || t.budget !== 'Special';
        const isKlintemarkenAllowed = includeKlintemarken || t.budget !== 'Klintemarken';

        return isInMonth && isNotExcluded && isSpecialAllowed && isKlintemarkenAllowed;
      });

      const income = monthTransactions.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);
      const expense = monthTransactions.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

      // Process subcategory contributors for the tooltip
      const subcategorySums: Record<string, number> = {};
      monthTransactions.forEach(t => {
        if (t.amount < 0) {
          const sub = t.subCategory || t.category || 'Other';
          subcategorySums[sub] = (subcategorySums[sub] || 0) + Math.abs(t.amount);
        }
      });

      const majorExpenses = Object.entries(subcategorySums)
        .sort(([, a], [, b]) => b - a)
        .filter(([, sum]) => expense > 0 && (sum / expense) > 0.25) // Threshold: > 25% of monthly expense
        .map(([name, sum]) => ({ name, sum }));

      return {
        month: monthLabel,
        fullMonth: fullMonthName,
        income,
        expense,
        balance: income - expense,
        majorExpenses
      };
    });
  }, [transactions, selectedPeriod, customDateRange]);

  const balanceTrend = useMemo(() => {
    let runningBalance = 0;
    return monthlyData.map(d => {
      runningBalance += d.balance;
      return { ...d, cumulativeBalance: runningBalance };
    });
  }, [monthlyData]);

  const radarData = useMemo(() => {
    const interval = getPeriodInterval(selectedPeriod, customDateRange);
    const monthsInPeriod = eachMonthOfInterval(interval).length;

    // Filter categories from budget if available
    const filteredBudgeted = budgetData?.categories.filter(cat => {
      const isExpenditure = cat.category_group === 'expenditure';
      const isSpecial = cat.category_group === 'special';
      const isKlintemarken = cat.category_group === 'klintemarken';

      if (isSpecial && !includeSpecial) return false;
      if (isKlintemarken && !includeKlintemarken) return false;

      return isExpenditure || isSpecial || isKlintemarken;
    }) || [];

    const dataMap: Record<string, { budgeted: number; actual: number }> = {};

    // Initialize map with budgeted categories
    filteredBudgeted.forEach(cat => {
      dataMap[cat.name] = {
        budgeted: Math.round(cat.budget_amount * monthsInPeriod),
        actual: 0
      };
    });

    // Add/merge actual spending from Transactions
    periodFiltered.forEach(t => {
      if (t.amount < 0) {
        const catName = t.category || 'Other';
        if (!dataMap[catName]) {
          dataMap[catName] = { budgeted: 0, actual: 0 };
        }
        dataMap[catName].actual += Math.abs(t.amount);
      }
    });

    return Object.entries(dataMap).map(([category, vals]) => ({
      category,
      budgeted: vals.budgeted,
      actual: Math.round(vals.actual)
    })).filter(d => d.budgeted > 0 || d.actual > 0)
      .sort((a, b) => b.budgeted - a.budgeted);
  }, [budgetData, periodFiltered, selectedPeriod, customDateRange, includeSpecial, includeKlintemarken]);

  const y2Data = useMemo(() => {
    const values = balanceTrend.map(d => d.cumulativeBalance);
    if (values.length === 0) return { domain: [-1000, 1000], ticks: [-1000, -500, 0, 500, 1000] };

    const absMax = Math.max(...values.map(v => Math.abs(v)), 100);
    // Find the next "nice" power of 10 or multiple of 5/10/25/50/100
    const magnitude = Math.pow(10, Math.floor(Math.log10(absMax)));
    const firstDigit = absMax / magnitude;
    let roundedMax;
    if (firstDigit <= 1) roundedMax = 1 * magnitude;
    else if (firstDigit <= 2) roundedMax = 2 * magnitude;
    else if (firstDigit <= 5) roundedMax = 5 * magnitude;
    else roundedMax = 10 * magnitude;

    // If it's too tight, go one step higher
    if (roundedMax < absMax * 1.1) {
      if (roundedMax === 1 * magnitude) roundedMax = 2 * magnitude;
      else if (roundedMax === 2 * magnitude) roundedMax = 5 * magnitude;
      else if (roundedMax === 5 * magnitude) roundedMax = 10 * magnitude;
      else roundedMax = 20 * magnitude;
    }

    return {
      domain: [-roundedMax, roundedMax],
      ticks: [-roundedMax, -roundedMax / 2, 0, roundedMax / 2, roundedMax]
    };
  }, [balanceTrend]);

  // Split balance for conditional area filling
  const splitBalanceTrend = useMemo(() => {
    return balanceTrend.map(d => ({
      ...d,
      posBalance: d.cumulativeBalance > 0 ? d.cumulativeBalance : 0,
      negBalance: d.cumulativeBalance < 0 ? d.cumulativeBalance : 0,
    }));
  }, [balanceTrend]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-4 rounded-xl shadow-xl border border-border min-w-[200px] animate-in fade-in zoom-in duration-200">
          <p className="text-sm font-bold text-foreground mb-3 border-b pb-2">{data.fullMonth}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-8">
              <span className="text-xs text-emerald-500 font-medium">Income:</span>
              <span className="text-xs font-bold text-emerald-500">{formatCurrency(data.income, settings.currency)}</span>
            </div>
            <div className="flex justify-between items-center gap-8">
              <span className="text-xs text-rose-500 font-medium">Expense:</span>
              <span className="text-xs font-bold text-rose-500">{formatCurrency(data.expense, settings.currency)}</span>
            </div>
            <div className="flex justify-between items-center gap-8 pt-1 border-t">
              <span className="text-xs text-blue-500 font-medium">Cumulative:</span>
              <span className={cn("text-xs font-bold", data.cumulativeBalance >= 0 ? "text-blue-500" : "text-amber-500")}>
                {formatCurrency(data.cumulativeBalance, settings.currency)}
              </span>
            </div>
          </div>

          {data.majorExpenses && data.majorExpenses.length > 0 && (
            <div className="mt-4 pt-3 border-t border-dashed">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Major Expenses</p>
              <div className="space-y-1">
                {data.majorExpenses.map((exp: any, i: number) => (
                  <div key={i} className="flex justify-between items-start gap-4">
                    <span className="text-[11px] text-foreground/70 flex-1 leading-tight">{exp.name}</span>
                    <span className="text-[11px] font-mono font-bold text-foreground">{formatCurrency(exp.sum, settings.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (budgetLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <span className="ml-3 text-muted-foreground font-medium">Loading Overview...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground tracking-tight">{selectedPeriod} Overview</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-special"
                checked={includeSpecial}
                onCheckedChange={setIncludeSpecial}
                className="data-[state=checked]:bg-emerald-500"
              />
              <Label htmlFor="include-special" className="text-sm font-medium text-muted-foreground">Include Special</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="include-klintemarken"
                checked={includeKlintemarken}
                onCheckedChange={setIncludeKlintemarken}
                className="data-[state=checked]:bg-emerald-500"
              />
              <Label htmlFor="include-klintemarken" className="text-sm font-medium text-muted-foreground">Include Klintemarken</Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-card transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {formatCurrency(summary.income, settings.currency)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-rose-500 shadow-sm bg-card transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-500">
                {formatCurrency(summary.expense, settings.currency)}
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border-l-4 shadow-sm bg-card transition-colors", netIncome >= 0 ? "border-l-blue-500" : "border-l-amber-500")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Net Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", netIncome >= 0 ? "text-blue-500" : "text-amber-500")}>
                {formatCurrency(netIncome, settings.currency)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="lg:col-span-2 shadow-sm bg-card transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">Cash Flow Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={splitBalanceTrend}>
                    <defs>
                      <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0.5" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="0.5" stopColor="#f43f5e" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartColors.text, fontSize: 12 }} />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartColors.text, fontSize: 10 }}
                      domain={[0, 'auto']}
                      tickFormatter={(val) => val === 0 ? '0 kr' : `${(val / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}k kr`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartColors.text, fontSize: 10 }}
                      domain={y2Data.domain}
                      ticks={y2Data.ticks}
                      tickFormatter={(val) => Math.abs(val) < 1 ? '0 kr' : `${(val / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}k kr`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine yAxisId="right" y={0} stroke={chartColors.grid} strokeWidth={2} />
                    <Bar yAxisId="left" dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar yAxisId="left" dataKey="expense" fill="#f43f5e" name="Expense" radius={[4, 4, 0, 0]} barSize={30} />

                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="posBalance"
                      fill="#10b981"
                      fillOpacity={0.3}
                      stroke="transparent"
                      connectNulls
                      isAnimationActive={false}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="negBalance"
                      fill="#f43f5e"
                      fillOpacity={0.3}
                      stroke="transparent"
                      connectNulls
                      isAnimationActive={false}
                    />

                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulativeBalance"
                      strokeWidth={3}
                      name="Cumulative"
                      stroke="url(#lineColor)"
                      dot={{ r: 4, strokeWidth: 2, stroke: settings.darkMode ? '#0f172a' : '#fff', fill: '#10b981' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-card transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={chartColors.radarGrid} />
                      <PolarAngleAxis dataKey="category" tick={{ fill: chartColors.text, fontSize: 10 }} />
                      <PolarRadiusAxis axisLine={false} tick={false} />
                      <Radar name="Budget" dataKey="budgeted" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                      <Radar name="Actual" dataKey="actual" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
                      <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip, border: 'none', borderRadius: '8px' }} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground italic">
                    No categories found for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-card transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {radarData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <div className="flex flex-col flex-1 mr-4">
                      <span className="font-semibold text-foreground/80">{item.category}</span>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (item.actual / (summary.expense || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-foreground whitespace-nowrap">{formatCurrency(item.actual, settings.currency)}</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        {((item.actual / (summary.expense || 1)) * 100).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </div>
                    </div>
                  </div>
                ))}
                {radarData.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground italic">No expense data for this period</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
