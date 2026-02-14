import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByBudgetDate } from '@/lib/dateUtils';
import { useAnnualBudget } from '@/hooks/useAnnualBudget';
import { parseISO, format, startOfMonth, eachMonthOfInterval } from 'date-fns';
import { da } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatUtils';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/contexts/ProfileContext';

export const KlintemarkenOverview = () => {
  const { transactions } = useTransactionTable();
  const { settings } = useSettings();
  const { selectedPeriod, customDateRange, includeKlintemarken } = usePeriod();
  const { userProfile } = useProfile();

  const amountFormat = userProfile?.amount_format || 'dot_decimal';

  const { budget: budgetData } = useAnnualBudget(new Date().getFullYear());

  // Filter for 'Klintemarken' budget type OR categories in the 'klintemarken' group
  const klintemarkenTransactions = useMemo(() => {
    const getGroup = (catName: string | null) => {
      if (!catName) return null;
      const cat = budgetData?.categories.find(c => c.name === catName);
      return cat?.category_group;
    };

    const periodFiltered = filterByBudgetDate(transactions, selectedPeriod, customDateRange);
    return periodFiltered.filter(t => (t.budget === 'Klintemarken' || getGroup(t.category) === 'klintemarken') && !t.excluded);
  }, [transactions, selectedPeriod, customDateRange, budgetData]);

  // Aggregate by category
  const categories = useMemo(() => {
    const map: Record<string, { total: number; count: number; icon?: string; color?: string }> = {};

    klintemarkenTransactions.forEach(t => {
      const cat = t.category || 'Maintenance';
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += t.amount;
      map[cat].count += 1;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      total: data.total,
      transactions: data.count
    })).sort((a, b) => a.total - b.total);
  }, [klintemarkenTransactions]);

  // Trend data
  const trendData = useMemo(() => {
    const months: Record<string, Record<string, any>> = {};

    klintemarkenTransactions.forEach(t => {
      const dateStr = t.budget_month || t.date;
      const month = format(parseISO(dateStr), 'MM/yy', { locale: da });
      const cat = t.category || 'Other';
      if (!months[month]) months[month] = { month };
      months[month][cat] = (months[month][cat] || 0) + Math.abs(t.amount);
    });

    return Object.values(months);
  }, [klintemarkenTransactions]);

  const totalSpent = klintemarkenTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

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
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <LucideIcons.Home className="w-16 h-16 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-amber-600/70 uppercase tracking-[0.2em]">Total Feeder Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tracking-tight">
              {formatCurrency(totalSpent, settings.currency, amountFormat)}
            </div>
            <div className="mt-2 text-[10px] font-bold text-amber-600/60 uppercase">
              Klintemarken & Project Assets
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <LucideIcons.ListChecks className="w-16 h-16 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-blue-600/70 uppercase tracking-[0.2em]">Transaction Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tracking-tight">
              {klintemarkenTransactions.length}
            </div>
            <div className="mt-2 text-[10px] font-bold text-blue-600/60 uppercase">
              Operations this period
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <LucideIcons.Layers className="w-16 h-16 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-emerald-600/70 uppercase tracking-[0.2em]">Active Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tracking-tight">
              {categories.length}
            </div>
            <div className="mt-2 text-[10px] font-bold text-emerald-600/60 uppercase">
              Expense classifications
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
              {categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-border/50 rounded-2xl bg-background/50 hover:bg-accent/5 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                      <LucideIcons.Hammer size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground/80 leading-tight">{category.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{category.transactions} transactions</p>
                    </div>
                  </div>
                  <div className={`text-right font-black text-lg ${category.total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(Math.abs(category.total), settings.currency, amountFormat)}
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
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
            <CardTitle className="text-lg font-black tracking-tight uppercase tracking-wider">Feeder Spend Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
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
                  {Array.from(new Set(klintemarkenTransactions.map(t => t.category || 'Other'))).slice(0, 5).map((cat, i) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={['#f59e0b', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6'][i % 5]}
                      strokeWidth={4}
                      dot={{ r: 4, strokeWidth: 2, stroke: settings.darkMode ? '#0f172a' : '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: settings.darkMode ? '#0f172a' : '#fff' }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
