import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSettings } from '@/hooks/useSettings';
import { useMemo } from 'react';
import { formatCurrency, formatDate } from '@/lib/formatUtils';

export const HistoryDashboard = () => {
    const { settings } = useSettings();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    const chartColors = useMemo(() => ({
        grid: settings.darkMode ? 'rgba(255, 255, 255, 0.1)' : '#f0f0f0',
        text: settings.darkMode ? '#94a3b8' : '#64748b',
        tooltip: {
            bg: settings.darkMode ? '#1e293b' : '#ffffff',
            text: settings.darkMode ? '#f8fafc' : '#1e293b',
            border: settings.darkMode ? '#334155' : '#e2e8f0'
        }
    }), [settings.darkMode]);

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
        if (curr.amount < 0 && !curr.excluded && curr.budget !== 'Exclude') { // Only expenses and not excluded
            const cat = curr.category || 'Uncategorized';
            acc[cat] = (acc[cat] || 0) + Math.abs(curr.amount);
        }
        return acc;
    }, {});

    const pieData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    const monthlyData = transactions.reduce((acc: any, curr) => {
        if (curr.amount < 0 && curr.budget_month && !curr.excluded && curr.budget !== 'Exclude') {
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
                <Card className="bg-card text-foreground">
                    <CardHeader>
                        <CardTitle>Spending by Category</CardTitle>
                        <CardDescription className="text-muted-foreground">{selectedYear} Expenses</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: chartColors.tooltip.bg,
                                        color: chartColors.tooltip.text,
                                        borderRadius: '12px',
                                        border: `1px solid ${chartColors.tooltip.border}`,
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                    }}
                                    itemStyle={{ color: chartColors.tooltip.text }}
                                    formatter={(value: any) => formatCurrency(Number(value), settings.currency)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-card text-foreground">
                    <CardHeader>
                        <CardTitle>Monthly Trend</CardTitle>
                        <CardDescription className="text-muted-foreground">{selectedYear} Monthly Spend</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: chartColors.text, fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: chartColors.text, fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: chartColors.tooltip.bg,
                                        color: chartColors.tooltip.text,
                                        borderRadius: '12px',
                                        border: `1px solid ${chartColors.tooltip.border}`,
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                    }}
                                    itemStyle={{ color: chartColors.tooltip.text }}
                                    formatter={(value: any) => formatCurrency(Number(value), settings.currency)}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="amount" fill="#8884d8" name="Total Spend" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card text-foreground">
                <CardHeader>
                    <CardTitle>Ledger</CardTitle>
                    <CardDescription className="text-muted-foreground">Transactions sorted by Budget Month</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-muted-foreground border-b border-border pb-2">
                            <div className="col-span-2">Budget Month</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-4">Description</div>
                            <div className="col-span-2">Category</div>
                            <div className="col-span-2 text-right">Amount</div>
                        </div>
                        {transactions.map((tx: any) => (
                            <div key={tx.id} className="grid grid-cols-12 gap-4 text-sm py-2 border-b border-border hover:bg-muted/50 transition-colors">
                                <div className="col-span-2 text-foreground font-medium">{formatDate(tx.budget_month)}</div>
                                <div className="col-span-2 text-muted-foreground">{formatDate(tx.date)}</div>
                                <div className="col-span-4 text-foreground">{tx.clean_description || tx.description}</div>
                                <div className="col-span-2">
                                    <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-[10px] font-medium uppercase tracking-wider">
                                        {tx.category}
                                    </span>
                                </div>
                                <div className={`col-span-2 text-right font-mono font-bold ${tx.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount), settings.currency)}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
