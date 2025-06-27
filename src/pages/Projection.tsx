
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const projectionData = [
  { month: 'Jul 2024', projectedIncome: 47000, actualIncome: 0, projectedExpense: 32000, actualExpense: 0 },
  { month: 'Aug 2024', projectedIncome: 47000, actualIncome: 0, projectedExpense: 33000, actualExpense: 0 },
  { month: 'Sep 2024', projectedIncome: 47000, actualIncome: 0, projectedExpense: 32500, actualExpense: 0 },
  { month: 'Oct 2024', projectedIncome: 48000, actualIncome: 0, projectedExpense: 34000, actualExpense: 0 },
  { month: 'Nov 2024', projectedIncome: 47000, actualIncome: 0, projectedExpense: 33500, actualExpense: 0 },
  { month: 'Dec 2024', projectedIncome: 50000, actualIncome: 0, projectedExpense: 35000, actualExpense: 0 },
];

const Projection = () => {
  const totalProjectedIncome = projectionData.reduce((sum, item) => sum + item.projectedIncome, 0);
  const totalProjectedExpense = projectionData.reduce((sum, item) => sum + item.projectedExpense, 0);
  const projectedNet = totalProjectedIncome - totalProjectedExpense;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Financial Projection</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Projected Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalProjectedIncome.toLocaleString()} DKK
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Projected Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalProjectedExpense.toLocaleString()} DKK
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Projected Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${projectedNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {projectedNet.toLocaleString()} DKK
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Projections vs Actuals</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} DKK`} />
                <Bar dataKey="projectedIncome" fill="#10b981" name="Projected Income" />
                <Bar dataKey="actualIncome" fill="#065f46" name="Actual Income" />
                <Bar dataKey="projectedExpense" fill="#ef4444" name="Projected Expense" />
                <Bar dataKey="actualExpense" fill="#991b1b" name="Actual Expense" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net Income Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={projectionData.map(item => ({
                ...item,
                projectedNet: item.projectedIncome - item.projectedExpense,
                actualNet: item.actualIncome - item.actualExpense
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} DKK`} />
                <Line type="monotone" dataKey="projectedNet" stroke="#3b82f6" strokeWidth={2} name="Projected Net" />
                <Line type="monotone" dataKey="actualNet" stroke="#1e40af" strokeWidth={2} name="Actual Net" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Projection Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Month</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Projected Income</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Actual Income</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Projected Expense</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Actual Expense</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Projected Net</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Actual Net</th>
                </tr>
              </thead>
              <tbody>
                {projectionData.map((item, index) => {
                  const projectedNet = item.projectedIncome - item.projectedExpense;
                  const actualNet = item.actualIncome - item.actualExpense;
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{item.month}</td>
                      <td className="py-3 px-2 text-right text-green-600 font-semibold">
                        {item.projectedIncome.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right text-green-700">
                        {item.actualIncome ? item.actualIncome.toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-red-600 font-semibold">
                        {item.projectedExpense.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right text-red-700">
                        {item.actualExpense ? item.actualExpense.toLocaleString() : '-'}
                      </td>
                      <td className={`py-3 px-2 text-right font-bold ${projectedNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {projectedNet.toLocaleString()}
                      </td>
                      <td className={`py-3 px-2 text-right font-bold ${actualNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {actualNet ? actualNet.toLocaleString() : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Projection;
