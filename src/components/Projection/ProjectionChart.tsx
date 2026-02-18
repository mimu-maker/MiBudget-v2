
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProjectionData } from '@/types/projection';

interface ProjectionChartProps {
  data: ProjectionData[];
  comparisonData?: ProjectionData[];
  title?: string;
  activeLabel?: string;
  comparisonLabel?: string;
}

const ProjectionChart = ({
  data,
  comparisonData,
  title = "Projection",
  activeLabel = "Current",
  comparisonLabel = "Master"
}: ProjectionChartProps) => {
  // Merge data for the chart and ensure expenses are negative for downward bars
  const combinedData = data.map((d, i) => ({
    ...d,
    // Ensure breakdown values exist
    income: d.income || 0,
    feeder: d.feeder || 0,
    expense: -(d.expense || 0),
    slush: -(d.slush || 0),
    value: d.value, // P/L line
    comparison: comparisonData?.[i]?.value // Master P/L line
  }));

  return (
    <Card className="mb-6 shadow-sm border-gray-100 overflow-hidden rounded-3xl">
      <CardHeader className="bg-gray-50/30 border-b border-gray-100/50 py-4">
        <CardTitle className="text-lg font-black tracking-tight text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              formatter={(value, name) => {
                const absVal = Math.abs(Number(value));
                return [`${absVal.toLocaleString()} DKK`, name];
              }}
              labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '8px', fontSize: '14px' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />

            {/* Bars for Income Breakdown */}
            <Bar
              dataKey="income"
              name="Income Projections"
              stackId="stack"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
            <Bar
              dataKey="feeder"
              name="Feeder Budgets"
              stackId="stack"
              fill="#34d399"
              radius={[0, 0, 0, 0]}
              barSize={32}
            />

            {/* Bars for Expense Breakdown (Negative) */}
            <Bar
              dataKey="expense"
              name="Primary Expenses"
              stackId="stack"
              fill="#f43f5e"
              radius={[0, 0, 0, 0]}
              barSize={32}
            />
            <Bar
              dataKey="slush"
              name="Slush Fund"
              stackId="stack"
              fill="#fb7185"
              radius={[0, 0, 4, 4]}
              barSize={32}
            />

            {/* Master Comparison Line (if in scenario) */}
            {comparisonData && (
              <Line
                name={`${comparisonLabel} P/L`}
                type="monotone"
                dataKey="comparison"
                stroke="#cbd5e1"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}

            {/* Active P/L Line */}
            <Line
              name={comparisonData ? "Scenario P/L" : "Projected P/L"}
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              strokeWidth={4}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProjectionChart;
