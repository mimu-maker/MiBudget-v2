
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const klintemarkenData = [
  { month: 'Jan', maintenance: -2500, improvements: -8000, utilities: -1200 },
  { month: 'Feb', maintenance: -1800, improvements: 0, utilities: -1100 },
  { month: 'Mar', maintenance: -3200, improvements: -5500, utilities: -1300 },
  { month: 'Apr', maintenance: -2100, improvements: -2000, utilities: -1150 },
  { month: 'May', maintenance: -1500, improvements: -12000, utilities: -1250 },
  { month: 'Jun', maintenance: -2800, improvements: -3500, utilities: -1200 },
];

const categories = [
  { name: 'Property Maintenance', total: -13900, transactions: 18 },
  { name: 'Home Improvements', total: -31000, transactions: 8 },
  { name: 'Property Utilities', total: -7200, transactions: 24 },
];

export const KlintemarkenOverview = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Klintemarken Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.transactions} transactions</p>
                  </div>
                  <div className={`text-right font-bold text-lg ${category.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {category.total.toLocaleString()} DKK
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Klintemarken Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={klintemarkenData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} DKK`} />
                <Line type="monotone" dataKey="maintenance" stroke="#ef4444" strokeWidth={2} name="Maintenance" />
                <Line type="monotone" dataKey="improvements" stroke="#f59e0b" strokeWidth={2} name="Improvements" />
                <Line type="monotone" dataKey="utilities" stroke="#8b5cf6" strokeWidth={2} name="Utilities" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
