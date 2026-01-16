
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod } from '@/lib/dateUtils';
import { parseISO, format } from 'date-fns';
import { da } from 'date-fns/locale';

export const SpecialOverview = () => {
  const { transactions } = useTransactionTable();
  const { selectedPeriod } = usePeriod();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Filter for 'Special' budget type
  const specialTransactions = useMemo(() => {
    const periodFiltered = filterByPeriod(transactions, selectedPeriod);
    return periodFiltered.filter(t => t.budget === 'Special');
  }, [transactions, selectedPeriod]);

  // Aggregate by category and subcategory
  const categories = useMemo(() => {
    const map: Record<string, { total: number; transactions: number; subcats: Record<string, { amount: number; count: number }> }> = {};

    specialTransactions.forEach(t => {
      const cat = t.category || 'Uncategorized';
      const sub = t.subCategory || 'Other';

      if (!map[cat]) map[cat] = { total: 0, transactions: 0, subcats: {} };
      map[cat].total += t.amount;
      map[cat].transactions += 1;

      if (!map[cat].subcats[sub]) map[cat].subcats[sub] = { amount: 0, count: 0 };
      map[cat].subcats[sub].amount += t.amount;
      map[cat].subcats[sub].count += 1;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      total: data.total,
      transactions: data.transactions,
      subcategories: Object.entries(data.subcats).map(([subName, subData]) => ({
        name: subName,
        amount: subData.amount,
        transactions: subData.count
      }))
    })).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [specialTransactions]);

  // Special trend - group by month
  const trendData = useMemo(() => {
    const months: Record<string, Record<string, number>> = {};
    const categoriesList = Array.from(new Set(specialTransactions.map(t => t.category || 'Other')));

    specialTransactions.forEach(t => {
      const month = format(parseISO(t.date), 'MMM', { locale: da });
      const cat = t.category || 'Other';
      if (!months[month]) months[month] = { month };
      months[month][cat] = (months[month][cat] || 0) + t.amount;
    });

    return Object.values(months);
  }, [specialTransactions]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) newSet.delete(categoryName);
      else newSet.add(categoryName);
      return newSet;
    });
  };

  const totalAmount = specialTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-none">
          <CardHeader className="bg-slate-50/50 rounded-t-xl">
            <CardTitle className="flex items-center justify-between text-lg">
              Special Budget Items
              <div className={`text-xl font-bold ${totalAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totalAmount >= 0 ? '+' : ''}{totalAmount.toLocaleString('da-DK')} DKK
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.name} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCategory(category.name)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-slate-100 p-1 rounded-md">
                        {expandedCategories.has(category.name) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{category.name}</h3>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-tight">{category.transactions} transactions</p>
                      </div>
                    </div>
                    <div className={`text-right font-black text-lg ${category.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {category.total >= 0 ? '+' : ''}{category.total.toLocaleString()}
                    </div>
                  </div>

                  {expandedCategories.has(category.name) && (
                    <div className="px-4 pb-4 bg-slate-50/30 border-t border-slate-50">
                      <div className="space-y-2 mt-4">
                        {category.subcategories.map((subcat) => (
                          <div key={subcat.name} className="flex items-center justify-between py-2.5 px-4 bg-white rounded-lg border border-slate-100 shadow-xs">
                            <div>
                              <div className="font-bold text-slate-700 text-sm">{subcat.name}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">{subcat.transactions} ops</div>
                            </div>
                            <div className={`font-bold text-sm ${subcat.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {subcat.amount >= 0 ? '+' : ''}{subcat.amount.toLocaleString()} DKK
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">No special items found for {selectedPeriod.toLowerCase()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none">
          <CardHeader className="bg-slate-50/50 rounded-t-xl">
            <CardTitle className="text-lg">Special Spend Trends</CardTitle>
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
                  {/* Dynamic lines for each category found */}
                  {Array.from(new Set(specialTransactions.map(t => t.category || 'Other'))).slice(0, 5).map((cat, i) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6'][i % 5]}
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
