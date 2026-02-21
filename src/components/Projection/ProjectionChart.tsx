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
}

const ProjectionChart = ({
  data,
  comparisonData,
  title = "Projection",
  activeLabel = "Current",
  comparisonLabel = "Master",
  chartView = "categories"
}: ProjectionChartProps) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Extract all unique sub-category names
  const uniqueSubCats = useMemo(() => {
    const income = new Set<string>();
    const expense = new Set<string>();

    data.forEach(d => {
      if (d.breakdown) {
        Object.keys(d.breakdown.incomeBreakdown).forEach(k => income.add(k));
        Object.keys(d.breakdown.expenseBreakdown).forEach(k => expense.add(k));
        Object.keys(d.breakdown.slushBreakdown).forEach(k => expense.add(k));

        // Handle Feeder Budget dynamically by sign in combinedData mapping, 
        // but add to sets here for Bar generation
        income.add('Feeder Budget');
        expense.add('Feeder Budget');
      }
    });

    return {
      income: Array.from(income).sort(),
      expense: Array.from(expense).sort()
    };
  }, [data]);

  const uniqueLabels = useMemo(() => {
    const labels = new Set<string>();
    data.forEach(d => {
      if (d.breakdown?.expenseLabelBreakdown) {
        Object.keys(d.breakdown.expenseLabelBreakdown).forEach(k => labels.add(k));
      }
    });
    return Array.from(labels).sort();
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
      Object.entries(d.breakdown.expenseBreakdown).forEach(([k, v]) => row[`out_${k}`] = v || 0);
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

      if (d.breakdown.expenseLabelBreakdown) {
        Object.entries(d.breakdown.expenseLabelBreakdown).forEach(([k, v]) => row[`lbl_${k}`] = v || 0);
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
    if (name.includes('[') && name.includes(']')) return '#fb7185'; // Slush item
    const colors = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#e11d48', '#be123c'];
    return colors[index % colors.length];
  };

  const getLabelColor = (name: string, index: number) => {
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
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeEntry.color }} />
          <span className="text-sm font-bold text-gray-800">{name}:</span>
          <span className={cn("text-sm font-black", isExpense ? "text-rose-600" : "text-emerald-600")}>
            {displayVal.toLocaleString()} DKK
          </span>
        </div>
      </div>
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

            {/* Income and Expenditure (Bars or Areas) */}
            {chartView === 'categories' ? (
              <>
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
              </>
            ) : (
              <>
                {uniqueSubCats.income.map((name, idx) => (
                  <Area
                    key={`in_${name}`}
                    yAxisId="bars"
                    type="monotone"
                    dataKey={`in_${name}`}
                    name={`in_${name}`}
                    stackId="income"
                    fill={getIncomeColor(name, idx)}
                    stroke={getIncomeColor(name, idx)}
                    fillOpacity={0.8}
                    onMouseEnter={() => setHoveredKey(`in_${name}`)}
                  />
                ))}
                {uniqueLabels.map((name, idx) => (
                  <Area
                    key={`lbl_${name}`}
                    yAxisId="bars"
                    type="monotone"
                    dataKey={`lbl_${name}`}
                    name={`lbl_${name}`}
                    stackId="expenditure"
                    fill={getLabelColor(name, idx)}
                    stroke={getLabelColor(name, idx)}
                    fillOpacity={0.8}
                    onMouseEnter={() => setHoveredKey(`lbl_${name}`)}
                  />
                ))}
              </>
            )}

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
              stroke="#8b5cf6"
              strokeWidth={4}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              onMouseEnter={() => setHoveredKey("cumulativeBalance")}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProjectionChart;
