
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
  // Merge data for the chart
  const combinedData = data.map((d, i) => ({
    ...d,
    comparison: comparisonData?.[i]?.value
  }));

  return (
    <Card className="mb-6 shadow-sm border-gray-100 overflow-hidden rounded-3xl">
      <CardHeader className="bg-gray-50/30 border-b border-gray-100/50 py-4">
        <CardTitle className="text-lg font-black tracking-tight text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
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
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(value) => [`${Number(value).toLocaleString()} DKK`]}
              labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
            {comparisonData && (
              <Line
                name={comparisonLabel}
                type="monotone"
                dataKey="comparison"
                stroke="#cbd5e1"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            <Line
              name={activeLabel}
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={4}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProjectionChart;
