import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod } from '@/lib/dateUtils';
import { parseISO, format } from 'date-fns';
import { da } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatUtils';

export const KlintemarkenOverview = () => {
  const { transactions } = useTransactionTable();
  const { settings } = useSettings();
  const { selectedPeriod, customDateRange } = usePeriod();

  // Filter for 'Klintemarken' budget type
  const klintemarkenTransactions = useMemo(() => {
    const periodFiltered = filterByPeriod(transactions, selectedPeriod, customDateRange);
    return periodFiltered.filter(t => t.budget === 'Klintemarken' && !t.excluded);
  }, [transactions, selectedPeriod, customDateRange]);

  // Aggregate by category
  const categories = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};

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
      const month = format(parseISO(t.date), 'MMM', { locale: da });
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-none bg-card transition-colors">
          <CardHeader className="bg-muted/30 rounded-t-xl transition-colors">
            <CardTitle className="flex items-center justify-between text-lg text-foreground">
              Klintemarken Spending
              <div className="text-xl font-bold text-foreground/90">
                {formatCurrency(totalSpent, settings.currency)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-5 border border-border/50 rounded-2xl bg-background/50 shadow-sm hover:shadow-md transition-all">
                  <div>
                    <h3 className="font-bold text-foreground/80">{category.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{category.transactions} transactions</p>
                  </div>
                  <div className={`text-right font-black text-lg ${category.total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(category.total, settings.currency)}
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed border-border transition-colors">
                  <p className="text-muted-foreground font-medium">No Klintemarken data for {(selectedPeriod === 'Custom' ? 'custom range' : selectedPeriod).toLowerCase()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none bg-card transition-colors">
          <CardHeader className="bg-muted/30 rounded-t-xl transition-colors">
            <CardTitle className="text-lg text-foreground">Spend Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartColors.text, fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartColors.text, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: chartColors.tooltip,
                      color: settings.darkMode ? '#f1f5f9' : '#1e293b'
                    }}
                  />
                  {Array.from(new Set(klintemarkenTransactions.map(t => t.category || 'Other'))).slice(0, 5).map((cat, i) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={['#f43f5e', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6'][i % 5]}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, stroke: settings.darkMode ? '#0f172a' : '#fff' }}
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
