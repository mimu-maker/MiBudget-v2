
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod } from '@/lib/dateUtils';
import { parseISO, format } from 'date-fns';
import { da } from 'date-fns/locale';

export const KlintemarkenOverview = () => {
  const { transactions } = useTransactionTable();
  const { selectedPeriod } = usePeriod();

  // Filter for 'Klintemarken' budget type
  const klintemarkenTransactions = useMemo(() => {
    const periodFiltered = filterByPeriod(transactions, selectedPeriod);
    return periodFiltered.filter(t => t.budget === 'Klintemarken');
  }, [transactions, selectedPeriod]);

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
    const categoriesList = Array.from(new Set(klintemarkenTransactions.map(t => t.category || 'Other')));

    klintemarkenTransactions.forEach(t => {
      const month = format(parseISO(t.date), 'MMM', { locale: da });
      const cat = t.category || 'Other';
      if (!months[month]) months[month] = { month };
      months[month][cat] = (months[month][cat] || 0) + Math.abs(t.amount);
    });

    return Object.values(months);
  }, [klintemarkenTransactions]);

  const totalSpent = klintemarkenTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-none">
          <CardHeader className="bg-slate-50/50 rounded-t-xl">
            <CardTitle className="flex items-center justify-between text-lg">
              Klintemarken Spending
              <div className="text-xl font-bold text-slate-800">
                {totalSpent.toLocaleString('da-DK')} DKK
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="font-bold text-slate-800">{category.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{category.transactions} transactions</p>
                  </div>
                  <div className={`text-right font-black text-lg ${category.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {category.total.toLocaleString()} <span className="text-xs font-normal ml-0.5 opacity-60">DKK</span>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">No Klintemarken data for {selectedPeriod.toLowerCase()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none">
          <CardHeader className="bg-slate-50/50 rounded-t-xl">
            <CardTitle className="text-lg">Spend Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  {Array.from(new Set(klintemarkenTransactions.map(t => t.category || 'Other'))).slice(0, 5).map((cat, i) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={['#f43f5e', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6'][i % 5]}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
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
import React from 'react';
