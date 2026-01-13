import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const HistoryDashboard = () => {
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions', 'history', selectedYear],
        queryFn: async () => {
            // Fetch for the selected year based on budget_month
            const start = `${selectedYear}-01-01`;
            const end = `${selectedYear}-12-31`;

            const { data } = await supabase
                .from('transactions')
                .select('*')
                .gte('budget_month', start)
                .lte('budget_month', end)
                .order('budget_month', { ascending: false });

            return data || [];
        }
    });

    // Process data for charts
    const categoryData = transactions.reduce((acc: any, curr) => {
        if (curr.amount < 0) { // Only expenses
            const cat = curr.category || 'Uncategorized';
            acc[cat] = (acc[cat] || 0) + Math.abs(curr.amount);
        }
        return acc;
    }, {});

    const pieData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    const monthlyData = transactions.reduce((acc: any, curr) => {
        if (curr.amount < 0 && curr.budget_month) {
            const month = curr.budget_month.substring(0, 7); // YYYY-MM
            acc[month] = (acc[month] || 0) + Math.abs(curr.amount);
        }
        return acc;
    }, {});

    const barData = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({
            month: month,
            amount: Math.round(Number(amount))
        }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">History & Trends</h2>
                <div className="flex items-center space-x-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Spending by Category</CardTitle>
                        <CardDescription>{selectedYear} Expenses</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Trend</CardTitle>
                        <CardDescription>{selectedYear} Monthly Spend</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="amount" fill="#8884d8" name="Total Spend" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ledger</CardTitle>
                    <CardDescription>Transactions sorted by Budget Month</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-gray-500 border-b pb-2">
                            <div className="col-span-2">Budget Month</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-4">Description</div>
                            <div className="col-span-2">Category</div>
                            <div className="col-span-2 text-right">Amount</div>
                        </div>
                        {transactions.map((tx: any) => (
                            <div key={tx.id} className="grid grid-cols-12 gap-4 text-sm py-2 border-b hover:bg-gray-50">
                                <div className="col-span-2">{tx.budget_month}</div>
                                <div className="col-span-2 text-gray-500">{tx.date}</div>
                                <div className="col-span-4">{tx.clean_description || tx.description}</div>
                                <div className="col-span-2">
                                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                        {tx.category}
                                    </span>
                                </div>
                                <div className={`col-span-2 text-right font-mono ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {tx.amount}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
