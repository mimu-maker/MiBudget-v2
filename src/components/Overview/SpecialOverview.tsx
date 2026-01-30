import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod } from '@/lib/dateUtils';
import { parseISO, format } from 'date-fns';
import { da } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatUtils';

export const SpecialOverview = () => {
  const { transactions } = useTransactionTable();
  const { settings } = useSettings();
  const { selectedPeriod, customDateRange } = usePeriod();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Filter for 'Special' budget type
  const specialTransactions = useMemo(() => {
    const periodFiltered = filterByPeriod(transactions, selectedPeriod, customDateRange);
    return periodFiltered.filter(t => t.budget === 'Special' && !t.excluded);
  }, [transactions, selectedPeriod, customDateRange]);

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
    const months: Record<string, any> = {};
    const categoriesList = Array.from(new Set(specialTransactions.map(t => t.category || 'Other')));

    specialTransactions.forEach(t => {
      const month = format(parseISO(t.date), 'MM/yy', { locale: da });
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
              Special Budget Items
              <div className={`text-xl font-bold ${totalAmount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {totalAmount >= 0 ? '+' : ''}{formatCurrency(totalAmount, settings.currency)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.name} className="border border-border/50 rounded-xl overflow-hidden shadow-sm bg-background/50">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleCategory(category.name)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-muted p-1 rounded-md">
                        {expandedCategories.has(category.name) ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground/90">{category.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{category.transactions} transactions</p>
                      </div>
                    </div>
                    <div className={`text-right font-black text-lg ${category.total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {category.total >= 0 ? '+' : ''}{formatCurrency(category.total, settings.currency)}
                    </div>
                  </div>

                  {expandedCategories.has(category.name) && (
                    <div className="px-4 pb-4 bg-muted/20 border-t border-border/30">
                      <div className="space-y-2 mt-4">
                        {category.subcategories.map((subcat) => (
                          <div key={subcat.name} className="flex items-center justify-between py-2.5 px-4 bg-background rounded-lg border border-border/50 shadow-sm">
                            <div>
                              <div className="font-bold text-foreground/80 text-sm">{subcat.name}</div>
                              <div className="text-[10px] text-muted-foreground font-bold uppercase">{subcat.transactions} ops</div>
                            </div>
                            <div className={`font-bold text-sm ${subcat.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {subcat.amount >= 0 ? '+' : ''}{formatCurrency(subcat.amount, settings.currency)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed border-border transition-colors">
                  <p className="text-muted-foreground font-medium">No special items found for {(selectedPeriod === 'Custom' ? 'custom range' : selectedPeriod).toLowerCase()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none bg-card transition-colors">
          <CardHeader className="bg-muted/30 rounded-t-xl transition-colors">
            <CardTitle className="text-lg text-foreground">Special Spend Trends</CardTitle>
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
                  {/* Dynamic lines for each category found */}
                  {Array.from(new Set(specialTransactions.map(t => t.category || 'Other'))).slice(0, 5).map((cat, i) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6'][i % 5]}
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
