import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ComposedChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { ProjectionData } from '@/types/projection';

interface ProjectionChartProps {
  data: ProjectionData[];
  comparisonData?: ProjectionData[];
  title?: string;
  activeLabel?: string;
  comparisonLabel?: string;
  chartView?: 'categories' | 'labels';
  unlabeledCategories?: string[];
}

const ProjectionChart = ({
  data,
  comparisonData,
  title = "Projection",
  activeLabel = "Current",
  comparisonLabel = "Master",
  unlabeledCategories = []
}: ProjectionChartProps) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Extract all unique sub-category names
  const uniqueSubCats = useMemo(() => {
    const income = new Set<string>();
    const expense = new Set<string>();

    data.forEach(d => {
      if (d.breakdown) {
        Object.keys(d.breakdown.incomeBreakdown).forEach(k => income.add(k));
        Object.keys(d.breakdown.expenseLabelBreakdown).forEach(k => expense.add(k));
        Object.keys(d.breakdown.slushBreakdown).forEach(k => expense.add(k));

        // Handle Feeder Budget dynamically by sign in combinedData mapping, 
        // but add to sets here for Bar generation
        income.add('Feeder Budget');
        expense.add('Feeder Budget');
      }
    });

    const getStackRank = (name: string) => {
      if (name === 'Feeder Budget') return 0;
      const lowerName = name.toLowerCase();
      if (lowerName.includes('fixed')) return 1;
      if (lowerName.includes('variable')) return 2;
      if (lowerName.includes('discretionary')) return 3;
      if (name.includes('[') && name.includes(']')) return 5; // Slush
      return 4; // Unlabeled or others
    };

    return {
      income: Array.from(income).sort(),
      expense: Array.from(expense).sort((a, b) => {
        const rankA = getStackRank(a);
        const rankB = getStackRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
      })
    };
  }, [data]);

  // Merge data for the chart
  const combinedData = useMemo(() => data.map((d, i) => {
    const row: any = {
      ...d,
      value: d.value,
      cumulativeBalance: d.cumulativeBalance,
      comparisonCumulative: comparisonData?.[i]?.cumulativeBalance
    };

    if (d.breakdown) {
      Object.entries(d.breakdown.incomeBreakdown).forEach(([k, v]) => row[`in_${k}`] = v || 0);
      Object.entries(d.breakdown.expenseLabelBreakdown).forEach(([k, v]) => row[`out_${k}`] = v || 0);
      Object.entries(d.breakdown.slushBreakdown).forEach(([k, v]) => row[`out_${k}`] = v || 0);

      // Feeder Budget placement based on sign
      const feederVal = d.breakdown.feederBreakdown['Feeder Budget'] || 0;
      if (feederVal >= 0) {
        row[`in_Feeder Budget`] = feederVal;
        row[`out_Feeder Budget`] = 0;
      } else {
        row[`in_Feeder Budget`] = 0;
        row[`out_Feeder Budget`] = Math.abs(feederVal);
      }
    }

    return row;
  }), [data, comparisonData]);

  const getIncomeColor = (name: string, index: number) => {
    if (name === 'Feeder Budget') return '#34d399';
    const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857'];
    return colors[index % colors.length];
  };

  const getExpenseColor = (name: string, index: number) => {
    if (name.includes('[') && name.includes(']')) return '#a855f7'; // Slush item: Purple

    const lowerName = name.toLowerCase();
    if (lowerName.includes('fixed')) return '#64748b'; // Grey
    if (lowerName.includes('variable')) return '#3b82f6'; // Blue
    if (lowerName.includes('discretionary')) return '#f59e0b'; // Orange
    if (lowerName.includes('unlabeled')) return '#ef4444'; // Red

    const colors = ['#f43f5e', '#a855f7', '#3b82f6', '#f59e0b', '#10b981'];
    return colors[index % colors.length];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    // Find the entry that matches the hoveredKey
    const activeEntry = payload.find((p: any) => p.dataKey === hoveredKey);
    if (!activeEntry) return null;

    const name = activeEntry.name.replace(/^(in_|out_|lbl_)/, '');
    const isExpense = activeEntry.name.startsWith('out_') || activeEntry.name.startsWith('lbl_');
    const displayVal = isExpense ? -Math.abs(Number(activeEntry.value)) : Number(activeEntry.value);

    return (
      <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-200">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-center gap-2">
          {/* Note: if color is a URL (gradient), fallback to standard neutral or extract it */}
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeEntry.color?.startsWith('url') ? '#94a3b8' : activeEntry.color }} />
          <span className="text-sm font-bold text-gray-800">{name}:</span>
          <span className={cn("text-sm font-black", isExpense ? "text-rose-600" : (name.includes('Balance') ? "text-primary" : "text-emerald-600"))}>
            {displayVal.toLocaleString()} DKK
          </span>
        </div>
        {name.toLowerCase() === 'unlabeled' && unlabeledCategories.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Unlabeled Items:</p>
            <ul className="text-xs text-gray-500 list-disc pl-4 mt-1 max-h-32 overflow-y-auto pr-2 space-y-0.5">
              {unlabeledCategories.map(cat => <li key={cat}>{cat}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const lineGradientOffset = useMemo(() => {
    const values = combinedData.map((d: any) => d.cumulativeBalance || 0);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    if (max === min) return 0;
    return max / (max - min);
  }, [combinedData]);

  const renderLineDot = (props: any) => {
    const { cx, cy, payload } = props;
    // Color dot based on monthly net value, not cumulative balance
    const isProfit = payload.value > 0;
    const dotColor = isProfit ? '#10b981' : '#f43f5e';

    return (
      <circle
        key={`dot-${payload.month}`}
        cx={cx}
        cy={cy}
        r={4}
        fill={dotColor}
        stroke="#fff"
        strokeWidth={2}
      />
    );
  };

  return (
    <Card className="mb-6 shadow-sm border-gray-100 overflow-hidden rounded-3xl">
      <CardHeader className="bg-gray-50/30 border-b border-gray-100/50 py-4 text-center">
        <CardTitle className="text-lg font-black tracking-tight text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart
            data={combinedData}
            barGap={8}
            barCategoryGap="15%"
            onMouseMove={(state) => {
              if (state?.activeTooltipIndex !== undefined) {
                // The item level hover is handled by Bar's onMouseEnter
              } else {
                setHoveredKey(null);
              }
            }}
          >
            <defs>
              <linearGradient id="projectionLineColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#10b981" stopOpacity={1} />
                <stop offset={lineGradientOffset} stopColor="#10b981" stopOpacity={1} />
                <stop offset={lineGradientOffset} stopColor="#f43f5e" stopOpacity={1} />
                <stop offset="1" stopColor="#f43f5e" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis
              yAxisId="bars"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="cumulative"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#8b5cf6' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

            <ReferenceLine yAxisId="cumulative" y={0} stroke="#e2e8f0" strokeDasharray="3 3" />

            {uniqueSubCats.income.map((name, idx) => (
              <Bar
                key={`in_${name}`}
                yAxisId="bars"
                dataKey={`in_${name}`}
                name={`in_${name}`}
                stackId="income"
                fill={getIncomeColor(name, idx)}
                radius={idx === uniqueSubCats.income.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                barSize={32}
                onMouseEnter={() => setHoveredKey(`in_${name}`)}
              />
            ))}
            {uniqueSubCats.expense.map((name, idx) => {
              const isSlush = name.includes('[') && name.includes(']');
              return (
                <Bar
                  key={`out_${name}`}
                  yAxisId="bars"
                  dataKey={`out_${name}`}
                  name={`out_${name}`}
                  stackId="expenditure"
                  fill={getExpenseColor(name, idx)}
                  stroke={isSlush ? "#fff" : "none"}
                  strokeWidth={isSlush ? 2 : 0}
                  radius={idx === uniqueSubCats.expense.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  barSize={32}
                  onMouseEnter={() => setHoveredKey(`out_${name}`)}
                />
              );
            })}

            {/* Cumulative Lines */}
            {comparisonData && (
              <Line
                yAxisId="cumulative"
                name="Master Balance"
                type="monotone"
                dataKey="comparisonCumulative"
                stroke="#cbd5e1"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                onMouseEnter={() => setHoveredKey("comparisonCumulative")}
              />
            )}

            <Line
              yAxisId="cumulative"
              name={comparisonData ? "Scenario Balance" : "Projected Balance"}
              type="monotone"
              dataKey="cumulativeBalance"
              stroke="url(#projectionLineColor)"
              strokeWidth={4}
              dot={renderLineDot}
              onMouseEnter={() => setHoveredKey("cumulativeBalance")}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProjectionChart;
