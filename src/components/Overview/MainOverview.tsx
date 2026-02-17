import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, ComposedChart, Area, ReferenceLine, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import * as LucideIcons from 'lucide-react';
import { useOverviewData } from '@/components/Overview/hooks/useOverviewData';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import BudgetSankey from '@/components/Budget/BudgetSankey';

export const MainOverview = () => {
  const [localIncludeSpecial, setLocalIncludeSpecial] = useState(true);
  const [localIncludeKlintemarken, setLocalIncludeKlintemarken] = useState(true);
  const [flowTab, setFlowTab] = useState<'cashflow' | 'categoryflow'>('cashflow');

  const toggleFilter = (type: 'special' | 'klintemarken') => {
    const isSpecial = type === 'special';
    const isKlintemarken = type === 'klintemarken';

    // Current state
    const current = isSpecial ? localIncludeSpecial : localIncludeKlintemarken;

    // If turning off, check if it's the last one enabled
    if (current) {
      const activeCount = (localIncludeSpecial ? 1 : 0) + (localIncludeKlintemarken ? 1 : 0);
      if (activeCount <= 1) return; // Prevent disabling the last one
    }

    if (isSpecial) setLocalIncludeSpecial(!localIncludeSpecial);
    if (isKlintemarken) setLocalIncludeKlintemarken(!localIncludeKlintemarken);
  };


  const {
    budgetLoading,
    settings,
    amountFormat,
    summary,
    netIncome,
    balanceTrend,
    y2Data,
    lineGradientOffset,
    radarData, // Still needed for the total budgeted amount in the expense card
    budgetData,
    flowFiltered,
  } = useOverviewData({
    includeCore: false,
    includeSpecial: localIncludeSpecial,
    includeKlintemarken: localIncludeKlintemarken
  });

  const chartColors = {
    grid: settings.darkMode ? '#1e293b' : '#f0f0f0',
    text: settings.darkMode ? '#94a3b8' : '#64748b',
    tooltip: settings.darkMode ? '#0f172a' : '#fff',
    radarGrid: settings.darkMode ? '#334155' : '#e2e8f0',
  };

  const renderLineDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.fullMonth === 'Start') return null;

    const isProfit = payload.balance > 0;
    const dotColor = isProfit ? '#10b981' : '#f43f5e';

    return (
      <circle
        key={`dot-${payload.month}`}
        cx={cx}
        cy={cy}
        r={4}
        fill={dotColor}
        stroke={settings.darkMode ? '#0f172a' : '#fff'}
        strokeWidth={2}
      />
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-4 rounded-xl shadow-xl border border-border min-w-[200px] animate-in fade-in zoom-in duration-200">
          <p className="text-sm font-bold text-foreground mb-3 border-b pb-2">{data.fullMonth}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-8">
              <span className="text-xs text-emerald-500 font-medium">Income:</span>
              <span className="text-xs font-bold text-emerald-500">{formatCurrency(data.income, settings.currency, amountFormat)}</span>
            </div>
            <div className="flex justify-between items-center gap-8">
              <span className="text-xs text-rose-500 font-medium">Expense:</span>
              <span className="text-xs font-bold text-rose-500">{formatCurrency(data.expense, settings.currency, amountFormat)}</span>
            </div>
            <div className="flex justify-between items-center gap-8 pt-1 border-t">
              <span className="text-xs text-blue-500 font-medium">Cumulative:</span>
              <span className={cn("text-xs font-bold", data.cumulativeBalance >= 0 ? "text-blue-500" : "text-amber-500")}>
                {formatCurrency(data.cumulativeBalance, settings.currency, amountFormat)}
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
                    <span className="text-[11px] font-mono font-bold text-foreground">{formatCurrency(exp.sum, settings.currency, amountFormat)}</span>
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

  // Categories with Actuals for Sankey (using flowFiltered logic from hook would be ideal, 
  // but hook returns flowFiltered transactions. We need to process them for Sankey.)
  // Replicating for now as it's specific to Sankey view.
  const categoriesWithActuals = budgetData?.categories
    .filter(cat => {
      if (cat.category_group === 'special' && !localIncludeSpecial) return false;
      if (cat.category_group === 'klintemarken' && !localIncludeKlintemarken) return false;
      if (cat.category_group !== 'special' && cat.category_group !== 'klintemarken') return false;
      return true;
    })
    .map(cat => {
      const actualSpent = flowFiltered
        .filter(t => t.category === cat.name)
        .reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

      const actualIncome = flowFiltered
        .filter(t => t.category === cat.name)
        .reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);

      return {
        ...cat,
        spent: cat.category_group === 'income' ? actualIncome : actualSpent,
        actual_income: actualIncome,
        sub_categories: cat.sub_categories.map(sub => {
          const subActualSpent = flowFiltered
            .filter(t => t.category === cat.name && t.subCategory === sub.name)
            .reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);
          const subActualIncome = flowFiltered
            .filter(t => t.category === cat.name && t.subCategory === sub.name)
            .reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);

          return {
            ...sub,
            spent: cat.category_group === 'income' ? subActualIncome : subActualSpent,
            actual_income: subActualIncome
          };
        })
      };
    }) || [];

  const totalActualIncome = flowFiltered.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);


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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 group hover:shadow-emerald-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <LucideIcons.TrendingUp className="w-16 h-16 text-emerald-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black text-emerald-600/70 uppercase tracking-[0.2em]">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-500 tracking-tight">
                {formatCurrency(summary.income, settings.currency, amountFormat)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600/60 uppercase">
                <LucideIcons.ArrowUpRight className="w-3 h-3" />
                Verified Sources
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-rose-500/10 to-rose-500/5 group hover:shadow-rose-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <LucideIcons.TrendingDown className="w-16 h-16 text-rose-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black text-rose-600/70 uppercase tracking-[0.2em]">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="text-3xl font-black text-rose-500 tracking-tight">
                  {formatCurrency(summary.expense, settings.currency, amountFormat)}
                </div>
                {radarData.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-rose-600/60 uppercase">
                    <LucideIcons.Target className="w-3 h-3" />
                    OF {formatCurrency(radarData.reduce((sum, d) => sum + d.budgeted, 0), settings.currency, amountFormat)} BUDGET
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "relative overflow-hidden border-none shadow-lg group transition-all duration-300",
            netIncome >= 0
              ? "bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:shadow-blue-500/10"
              : "bg-gradient-to-br from-amber-500/10 to-amber-500/5 hover:shadow-amber-500/10"
          )}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <LucideIcons.PiggyBank className={cn("w-16 h-16", netIncome >= 0 ? "text-blue-500" : "text-amber-500")} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className={cn("text-xs font-black uppercase tracking-[0.2em]", netIncome >= 0 ? "text-blue-600/70" : "text-amber-600/70")}>Net Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-black tracking-tight", netIncome >= 0 ? "text-blue-500" : "text-amber-500")}>
                {formatCurrency(netIncome, settings.currency, amountFormat)}
              </div>
              <div className={cn("mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase", netIncome >= 0 ? "text-blue-600/60" : "text-amber-600/60")}>
                <LucideIcons.Scale className="w-3 h-3" />
                {netIncome >= 0 ? "Surplus" : "Deficit"} this period
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="col-span-1 shadow-sm bg-card transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex bg-muted p-1 rounded-lg">
                <Button
                  variant={flowTab === 'cashflow' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-md h-8 text-xs font-bold"
                  onClick={() => setFlowTab('cashflow')}
                >
                  Cash Flow
                </Button>
                <Button
                  variant={flowTab === 'categoryflow' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-md h-8 text-xs font-bold"
                  onClick={() => setFlowTab('categoryflow')}
                >
                  Category Flow
                </Button>
              </div>

              <div className="flex items-center space-x-2">

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFilter('klintemarken')}
                  className={cn(
                    "h-7 px-3 rounded-full text-[10px] font-black transition-all gap-1.5 border-2",
                    localIncludeKlintemarken
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                      : "bg-background border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  <LucideIcons.Wallet className={cn("w-3 h-3", localIncludeKlintemarken ? "fill-blue-500/50" : "")} />
                  FEEDER
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFilter('special')}
                  className={cn(
                    "h-7 px-3 rounded-full text-[10px] font-black transition-all gap-1.5 border-2",
                    localIncludeSpecial
                      ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                      : "bg-background border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  <LucideIcons.PiggyBank className={cn("w-3 h-3", localIncludeSpecial ? "fill-purple-500/50" : "")} />
                  SLUSH
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {flowTab === 'cashflow' ? (
                <div className="h-[400px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={balanceTrend}>
                      <defs>
                        <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#10b981" stopOpacity={1} />
                          <stop offset={lineGradientOffset} stopColor="#10b981" stopOpacity={1} />
                          <stop offset={lineGradientOffset} stopColor="#f43f5e" stopOpacity={1} />
                          <stop offset="1" stopColor="#f43f5e" stopOpacity={1} />
                        </linearGradient>
                        <linearGradient id="fillColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset={lineGradientOffset} stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset={lineGradientOffset} stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="1" stopColor="#f43f5e" stopOpacity={0.3} />
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
                        tickFormatter={(val) => !val ? '0' : formatCurrency(val, settings.currency, amountFormat).split(' ')[0].split('.')[0].split(',')[0]}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: chartColors.text, fontSize: 10 }}
                        domain={y2Data.domain}
                        ticks={y2Data.ticks}
                        tickFormatter={(val) => !val ? '0' : formatCurrency(val, settings.currency, amountFormat).split(' ')[0].split('.')[0].split(',')[0]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine yAxisId="right" y={0} stroke={chartColors.grid} strokeWidth={2} />
                      <Bar yAxisId="left" dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar yAxisId="left" dataKey="expense" fill="#f43f5e" name="Expense" radius={[4, 4, 0, 0]} barSize={30} />

                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="cumulativeBalance"
                        fill="url(#fillColor)"
                        stroke="transparent" // Area stroke is transparent, the Line handles the stroke
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
                        dot={renderLineDot}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <BudgetSankey
                  budgetData={categoriesWithActuals as any}
                  denominator={totalActualIncome}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
