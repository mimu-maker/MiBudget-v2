
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const monthlyData = [
  { month: 'Jan', income: 45000, expense: 32000 },
  { month: 'Feb', income: 47000, expense: 31500 },
  { month: 'Mar', income: 46000, expense: 33000 },
  { month: 'Apr', income: 48000, expense: 32500 },
  { month: 'May', income: 47500, expense: 31000 },
  { month: 'Jun', income: 49000, expense: 34000 },
];

const balanceData = [
  { month: 'Jan', balance: 125000 },
  { month: 'Feb', balance: 140500 },
  { month: 'Mar', balance: 153500 },
  { month: 'Apr', balance: 169000 },
  { month: 'May', balance: 185500 },
  { month: 'Jun', balance: 200500 },
];

const radarData = [
  { category: 'Housing', budgeted: 15000, actual: 14500 },
  { category: 'Food', budgeted: 4000, actual: 4200 },
  { category: 'Transport', budgeted: 3000, actual: 2800 },
  { category: 'Utilities', budgeted: 2000, actual: 2100 },
  { category: 'Entertainment', budgeted: 2500, actual: 3000 },
  { category: 'Healthcare', budgeted: 1500, actual: 1200 },
];

export const MainOverview = () => {
  const [includeSpecial, setIncludeSpecial] = useState(false);
  const [includeKlintemarken, setIncludeKlintemarken] = useState(false);
  const [periodSelector, setPeriodSelector] = useState('MTD');

  const totalIncome = monthlyData.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = monthlyData.reduce((sum, item) => sum + item.expense, 0);
  const netIncome = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* YTD Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Year to Date</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-special"
                checked={includeSpecial}
                onCheckedChange={setIncludeSpecial}
              />
              <Label htmlFor="include-special">Include Special</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="include-klintemarken"
                checked={includeKlintemarken}
                onCheckedChange={setIncludeKlintemarken}
              />
              <Label htmlFor="include-klintemarken">Include Klintemarken</Label>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalIncome.toLocaleString('da-DK')} DKK
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {totalExpense.toLocaleString('da-DK')} DKK
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Net Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netIncome.toLocaleString('da-DK')} DKK
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()} DKK`} />
                  <Bar dataKey="income" fill="#10b981" name="Income" />
                  <Bar dataKey="expense" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={balanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()} DKK`} />
                  <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Categories: Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis />
                  <Radar name="Budgeted" dataKey="budgeted" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Actual" dataKey="actual" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Period Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Period Analysis</h2>
          <Select value={periodSelector} onValueChange={setPeriodSelector}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MTD">Month to Date</SelectItem>
              <SelectItem value="Last Month">Last Month</SelectItem>
              <SelectItem value="QTD">Quarter to Date</SelectItem>
              <SelectItem value="Last Q">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis />
                  <Radar name="Budget" dataKey="budgeted" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Actual" dataKey="actual" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {radarData.map((item, index) => {
                  const delta = item.actual - item.budgeted;
                  const deltaPercent = ((delta / item.budgeted) * 100).toFixed(1);
                  return (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <span className="font-medium">{item.category}</span>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {item.budgeted.toLocaleString()} / {item.actual.toLocaleString()} DKK
                        </div>
                        <div className={`text-sm font-semibold ${delta >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {delta >= 0 ? '+' : ''}{delta.toLocaleString()} ({deltaPercent}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
