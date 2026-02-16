import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp, Star, TrendingUp, TrendingDown, PiggyBank, SearchX } from 'lucide-react';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByBudgetDate } from '@/lib/dateUtils';
import { useAnnualBudget } from '@/hooks/useAnnualBudget';
import { parseISO, format, startOfMonth, eachMonthOfInterval } from 'date-fns';
import { da } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import { useProfile } from '@/contexts/ProfileContext';

export const SpecialOverview = () => {
  const { transactions } = useTransactionTable();
  const { settings } = useSettings();
  const { selectedPeriod, customDateRange, includeSpecial } = usePeriod();
  const { userProfile } = useProfile();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const amountFormat = userProfile?.amount_format || 'dot_decimal';

  // Filter for 'Special' budget type
  const { budget: budgetData } = useAnnualBudget(new Date().getFullYear()); // Use current year for category mapping

  // Filter for 'Special' budget type OR categories in the 'special' group
  const specialTransactions = useMemo(() => {
    const getGroup = (catName: string | null) => {
      if (!catName) return null;
      const cat = budgetData?.categories.find(c => c.name === catName);
      return cat?.category_group;
    };

    const periodFiltered = filterByBudgetDate(transactions, selectedPeriod, customDateRange);
    return periodFiltered.filter(t => (t.budget === 'Special' || getGroup(t.category) === 'special') && !t.excluded);
  }, [transactions, selectedPeriod, customDateRange, budgetData]);

  // Aggregate by category and subcategory
  const categories = useMemo(() => {
    const map: Record<string, { total: number; transactions: number; subcats: Record<string, { amount: number; count: number }> }> = {};

    specialTransactions.forEach(t => {
      const cat = t.category || 'Uncategorized';
      const sub = t.sub_category || 'Other';

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

    specialTransactions.forEach(t => {
      const dateStr = t.budget_month || t.date;
      const month = format(parseISO(dateStr), 'MM/yy', { locale: da });
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

  if (!includeSpecial) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-purple-500/5 rounded-[2.5rem] border-2 border-dashed border-purple-500/20 animate-in fade-in duration-500">
        <PiggyBank className="w-16 h-16 text-purple-300 mb-6" />
        <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-2">Slush Fund Hidden</h3>
        <p className="text-purple-600/70 dark:text-purple-400 font-medium text-center max-w-sm">
          Enable the Slush Fund toggle in the top right to analyze your special savings and unplanned expenses.
        </p>
      </div>
    );
  }

  const slushBudgetAccount = useMemo(() => {
    const specialCat = budgetData?.categories.find(c => c.name === 'Special');
    return specialCat?.budget_amount || 0;
  }, [budgetData]);

  // Adjust total period budget based on selected period
  const periodBudget = useMemo(() => {
    if (selectedPeriod === 'All') return slushBudgetAccount * 12;
    if (selectedPeriod === 'Year to Date') {
      const months = new Date().getMonth() + 1;
      return slushBudgetAccount * months;
    }
    if (selectedPeriod === 'This Quarter') return slushBudgetAccount * 3;
    if (selectedPeriod === 'Custom' && customDateRange?.from && customDateRange?.to) {
      const diffTime = Math.abs(customDateRange.to.getTime() - customDateRange.from.getTime());
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
      return slushBudgetAccount * diffMonths;
    }
    return slushBudgetAccount; // Default to monthly
  }, [slushBudgetAccount, selectedPeriod, customDateRange]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PiggyBank className="w-16 h-16 text-purple-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-purple-600/70 uppercase tracking-[0.2em]">Slush Fund Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-black tracking-tight", totalAmount >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {totalAmount >= 0 ? '+' : ''}{formatCurrency(totalAmount, settings.currency, amountFormat)}
            </div>
            <div className="mt-2 text-[10px] font-bold text-purple-600/60 uppercase">
              Balance change this period
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Star className="w-16 h-16 text-indigo-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-indigo-600/70 uppercase tracking-[0.2em]">Fund Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-indigo-500 tracking-tight">
              {formatCurrency(periodBudget, settings.currency, amountFormat)}
            </div>
            <div className="mt-2 text-[10px] font-bold text-indigo-600/60 uppercase">
              Budgeted for this period
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-amber-600/70 uppercase tracking-[0.2em]">Total Inflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-500 tracking-tight">
              {formatCurrency(specialTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0), settings.currency, amountFormat)}
            </div>
            <div className="mt-2 text-[10px] font-bold text-amber-600/60 uppercase">
              Slush Fund Income / Transfers In
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-rose-500/10 to-rose-500/5 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown className="w-16 h-16 text-rose-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-rose-600/70 uppercase tracking-[0.2em]">Total Outflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-rose-500 tracking-tight">
              {formatCurrency(specialTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0), settings.currency, amountFormat)}
            </div>
            <div className="mt-2 text-[10px] font-bold text-rose-600/60 uppercase">
              Slush Fund Expenses / Transfers Out
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-xl border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-lg font-black tracking-tight uppercase tracking-wider">Slush Fund Items</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.name} className="border border-border/50 rounded-2xl overflow-hidden shadow-sm bg-background/50 group transition-all duration-300">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleCategory(category.name)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                        {expandedCategories.has(category.name) ? <ChevronUp size={16} strokeWidth={3} /> : <ChevronDown size={16} strokeWidth={3} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground/90 leading-tight">{category.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{category.transactions} transactions</p>
                      </div>
                    </div>
                    <div className={`text-right font-black text-lg ${category.total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {category.total >= 0 ? '+' : ''}{formatCurrency(category.total, settings.currency, amountFormat)}
                    </div>
                  </div>

                  {expandedCategories.has(category.name) && (
                    <div className="px-4 pb-4 mt-2 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2 border-t border-border/30 pt-4">
                        {category.subcategories.map((subcat) => (
                          <div key={subcat.name} className="flex items-center justify-between py-3 px-5 bg-background/80 rounded-xl border border-border/50 shadow-sm hover:border-purple-500/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <Star className="w-3 h-3 text-purple-400" />
                              <div>
                                <div className="font-bold text-foreground/80 text-sm">{subcat.name}</div>
                                <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none">{subcat.transactions} acts</div>
                              </div>
                            </div>
                            <div className={`font-black text-sm ${subcat.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {subcat.amount >= 0 ? '+' : ''}{formatCurrency(subcat.amount, settings.currency, amountFormat)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {categories.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50 transition-colors">
                  <SearchX className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No slush fund data found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-lg font-black tracking-tight uppercase tracking-wider">Slush Fund Trend</CardTitle>
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
                  {Array.from(new Set(specialTransactions.map(t => t.category || 'Other'))).slice(0, 5).map((cat, i) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e'][i % 5]}
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
