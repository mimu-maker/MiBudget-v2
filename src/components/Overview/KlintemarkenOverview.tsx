import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSettings } from '@/hooks/useSettings';
import { usePeriod } from '@/contexts/PeriodContext';
import { useOverviewData } from '@/components/Overview/hooks/useOverviewData';
import { formatCurrency } from '@/lib/formatUtils';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/contexts/ProfileContext';

export const KlintemarkenOverview = () => {
  const { settings } = useSettings();
  const { includeKlintemarken } = usePeriod();
  const { userProfile } = useProfile();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const amountFormat = userProfile?.amount_format || 'dot_decimal';

  // Use the central data hook for consistent filtering
  const { flowFiltered: klintemarkenTransactions, monthlyData, summary } = useOverviewData({
    includeCore: false,
    includeSpecial: false,
    includeKlintemarken: true
  });

  const toggleCategory = (name: string) => {
    const next = new Set(expandedCategories);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpandedCategories(next);
  };

  // Aggregate by category AND sub-category
  const categoriesTable = useMemo(() => {
    const map: Record<string, {
      total: number;
      count: number;
      subcategories: Record<string, { total: number; count: number }>
    }> = {};

    klintemarkenTransactions.forEach(t => {
      const cat = t.category || 'Maintenance';
      const sub = t.subCategory || 'Other';

      if (!map[cat]) map[cat] = { total: 0, count: 0, subcategories: {} };
      if (!map[cat].subcategories[sub]) map[cat].subcategories[sub] = { total: 0, count: 0 };

      map[cat].total += t.amount;
      map[cat].count += 1;
      map[cat].subcategories[sub].total += t.amount;
      map[cat].subcategories[sub].count += 1;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      total: data.total,
      transactions: data.count,
      subcategories: Object.entries(data.subcategories).map(([subName, subData]) => ({
        name: subName,
        total: subData.total,
        transactions: subData.count
      })).sort((a, b) => a.total - b.total)
    })).sort((a, b) => a.total - b.total);
  }, [klintemarkenTransactions]);

  // Enhanced Trend Data with Trajectory
  const trendDataWithTrajectory = useMemo(() => {
    // 1. Get months with transactions
    const monthsWithData = monthlyData.filter(m => m.income !== 0 || m.expense !== 0);
    if (monthsWithData.length === 0) return monthlyData;

    // 2. Find last index with data
    let lastIndex = -1;
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      if (monthlyData[i].income !== 0 || monthlyData[i].expense !== 0) {
        lastIndex = i;
        break;
      }
    }

    if (lastIndex === -1) return monthlyData;

    // 3. Calculate averages up to lastIndex
    const avgIncome = monthsWithData.reduce((sum, m) => sum + m.income, 0) / monthsWithData.length;
    const avgExpense = monthsWithData.reduce((sum, m) => sum + m.expense, 0) / monthsWithData.length;
    const avgBalance = monthsWithData.reduce((sum, m) => sum + m.balance, 0) / monthsWithData.length;

    // 4. Build projection
    return monthlyData.map((m, i) => {
      const isProjected = i > lastIndex;
      const isConnection = i === lastIndex;

      return {
        ...m,
        actualIncome: i <= lastIndex ? m.income : null,
        actualExpense: i <= lastIndex ? m.expense : null,
        actualBalance: i <= lastIndex ? m.balance : null,
        projectedIncome: i >= lastIndex ? (isConnection ? m.income : avgIncome) : null,
        projectedExpense: i >= lastIndex ? (isConnection ? m.expense : avgExpense) : null,
        projectedBalance: i >= lastIndex ? (isConnection ? m.balance : avgBalance) : null,
      };
    });
  }, [monthlyData]);

  const totalSpent = summary.expense;
  const totalIncome = summary.income;
  const netProfit = totalIncome - totalSpent;

  const chartColors = useMemo(() => ({
    grid: settings.darkMode ? '#1e293b' : '#f0f0f0',
    text: settings.darkMode ? '#94a3b8' : '#64748b',
    tooltip: settings.darkMode ? '#0f172a' : '#fff',
  }), [settings.darkMode]);

  if (!includeKlintemarken) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-amber-500/5 rounded-[2.5rem] border-2 border-dashed border-amber-500/20 animate-in fade-in duration-500">
        <LucideIcons.Wallet className="w-16 h-16 text-amber-300 mb-6" />
        <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">Feeder Budgets Hidden</h3>
        <p className="text-amber-600/70 dark:text-amber-400 font-medium text-center max-w-sm">
          Enable the Feeder Budgets toggle in the top right to analyze your property and asset-specific spending.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <LucideIcons.TrendingUp className="w-16 h-16 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-emerald-600/70 uppercase tracking-[0.2em]">Total Feeder Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tracking-tight">
              {formatCurrency(totalIncome, settings.currency, amountFormat)}
            </div>
            <div className="mt-2 text-[10px] font-bold text-emerald-600/60 uppercase">
              Credits & Inflow
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-rose-500/10 to-rose-500/5 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <LucideIcons.TrendingDown className="w-16 h-16 text-rose-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-rose-600/70 uppercase tracking-[0.2em]">Total Feeder Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-rose-600 tracking-tight">
              {formatCurrency(totalSpent, settings.currency, amountFormat)}
            </div>
            <div className="mt-2 text-[10px] font-bold text-rose-600/60 uppercase">
              Operations & Outflow
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "relative overflow-hidden border-none shadow-lg group",
          netProfit >= 0
            ? "bg-gradient-to-br from-blue-500/10 to-blue-500/5"
            : "bg-gradient-to-br from-amber-500/10 to-amber-500/5"
        )}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <LucideIcons.Scale className={cn("w-16 h-16", netProfit >= 0 ? "text-blue-500" : "text-amber-500")} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className={cn(
              "text-xs font-black uppercase tracking-[0.2em]",
              netProfit >= 0 ? "text-blue-600/70" : "text-amber-600/70"
            )}>{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-3xl font-black tracking-tight",
              netProfit >= 0 ? "text-blue-600" : "text-amber-600"
            )}>
              {formatCurrency(netProfit, settings.currency, amountFormat)}
            </div>
            <div className={cn(
              "mt-2 text-[10px] font-bold uppercase",
              netProfit >= 0 ? "text-blue-600/60" : "text-amber-600/60"
            )}>
              Period performance
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-lg font-black tracking-tight uppercase tracking-wider">Spending Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {categoriesTable.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div
                    onClick={() => toggleCategory(category.name)}
                    className="flex items-center justify-between p-4 border border-border/50 rounded-2xl bg-background/50 hover:bg-accent/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                        <LucideIcons.Hammer size={18} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground/80 leading-tight flex items-center gap-2">
                          {category.name}
                          <LucideIcons.ChevronRight className={cn("w-3 h-3 transition-transform", expandedCategories.has(category.name) && "rotate-90")} />
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{category.transactions} transactions</p>
                      </div>
                    </div>
                    <div className={`text-right font-black text-lg ${category.total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatCurrency(Math.abs(category.total), settings.currency, amountFormat)}
                    </div>
                  </div>

                  {expandedCategories.has(category.name) && (
                    <div className="ml-14 space-y-2 animate-in slide-in-from-top-2 duration-200">
                      {category.subcategories.map((sub, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between p-3 rounded-xl bg-accent/5 border border-border/30">
                          <span className="text-sm font-medium text-muted-foreground">{sub.name}</span>
                          <span className={`text-sm font-bold ${sub.total >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                            {formatCurrency(Math.abs(sub.total), settings.currency, amountFormat)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {categoriesTable.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50 transition-colors">
                  <LucideIcons.Wind className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No feeder data found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-lg font-black tracking-tight uppercase tracking-wider">Klintemarken Trajectory</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendDataWithTrajectory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartColors.text, fontSize: 12, fontWeight: 'bold' }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 'bold' }}
                    tickFormatter={(val) => !val ? '0' : formatCurrency(val, settings.currency).split(' ')[0].split('.')[0].split(',')[0]}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                      backgroundColor: chartColors.tooltip,
                      padding: '12px'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.5 }}
                  />

                  {/* Flows as Bars */}
                  <Bar dataKey="actualIncome" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="actualExpense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />

                  <Bar dataKey="projectedIncome" name="Projected Income" fill="#10b981" fillOpacity={0.2} radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="projectedExpense" name="Projected Expense" fill="#f43f5e" fillOpacity={0.2} radius={[4, 4, 0, 0]} barSize={20} />

                  {/* Profit/Loss as Line */}
                  <Line
                    type="monotone"
                    dataKey="actualBalance"
                    name="P/L Actual"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="projectedBalance"
                    name="P/L Projected"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
