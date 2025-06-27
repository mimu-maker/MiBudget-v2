
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const specialData = [
  { month: 'Jan', vacation: 5000, gifts: -2000, bonus: 15000 },
  { month: 'Feb', vacation: 0, gifts: -1500, bonus: 0 },
  { month: 'Mar', vacation: 3000, gifts: -800, bonus: 0 },
  { month: 'Apr', vacation: 0, gifts: -1200, bonus: 0 },
  { month: 'May', vacation: 8000, gifts: -2500, bonus: 0 },
  { month: 'Jun', vacation: 2000, gifts: -900, bonus: 10000 },
];

const categories = [
  { name: 'Vacation Fund', total: 18000, transactions: 6 },
  { name: 'Gift Fund', total: -8900, transactions: 12 },
  { name: 'Bonus Income', total: 25000, transactions: 2 },
];

export const SpecialOverview = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Special Categories</CardTitle>
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
                    {category.total >= 0 ? '+' : ''}{category.total.toLocaleString()} DKK
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Special Items Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={specialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} DKK`} />
                <Line type="monotone" dataKey="vacation" stroke="#10b981" strokeWidth={2} name="Vacation" />
                <Line type="monotone" dataKey="gifts" stroke="#ef4444" strokeWidth={2} name="Gifts" />
                <Line type="monotone" dataKey="bonus" stroke="#3b82f6" strokeWidth={2} name="Bonus" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
