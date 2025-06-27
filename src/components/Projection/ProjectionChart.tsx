
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProjectionData } from '@/types/projection';

interface ProjectionChartProps {
  data: ProjectionData[];
}

const ProjectionChart = ({ data }: ProjectionChartProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>12-Month Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip formatter={(value) => `${Number(value).toLocaleString()} DKK`} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 6 }}
              strokeDasharray={0}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProjectionChart;
