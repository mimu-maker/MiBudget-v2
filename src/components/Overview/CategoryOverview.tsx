import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOverviewData } from '@/components/Overview/hooks/useOverviewData';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import * as LucideIcons from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';

interface CategoryOverviewProps {
    includeCore?: boolean;
    includeSpecial: boolean;
    includeKlintemarken: boolean;
}

export const CategoryOverview = ({ includeCore = true, includeSpecial, includeKlintemarken }: CategoryOverviewProps) => {
    const {
        monthlyData,
        radarData,
        settings,
        amountFormat,
    } = useOverviewData({ includeCore, includeSpecial, includeKlintemarken });

    const chartColors = {
        grid: settings.darkMode ? '#1e293b' : '#f0f0f0',
        text: settings.darkMode ? '#94a3b8' : '#64748b',
        tooltip: settings.darkMode ? '#0f172a' : '#fff',
        radarGrid: settings.darkMode ? '#334155' : '#e2e8f0',
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="lg:col-span-2 shadow-sm bg-card transition-colors">
                    <CardHeader>
                        <CardTitle className="text-lg">Expenses Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartColors.text, fontSize: 12 }} />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: chartColors.text, fontSize: 10 }}
                                        tickFormatter={(val) => !val ? '0' : formatCurrency(val, settings.currency, amountFormat).split(' ')[0].split('.')[0].split(',')[0]}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: chartColors.tooltip,
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                        }}
                                        formatter={(value: any) => formatCurrency(Number(value), settings.currency, amountFormat)}
                                    />
                                    <Legend />
                                    {radarData.map((cat) => (
                                        <Line
                                            key={cat.category}
                                            type="monotone"
                                            dataKey={cat.category}
                                            stroke={cat.color || '#94a3b8'}
                                            strokeWidth={2}
                                            name={cat.category}
                                            dot={false}
                                            activeDot={{ r: 4, strokeWidth: 2, stroke: settings.darkMode ? '#0f172a' : '#fff' }}
                                            connectNulls
                                        />
                                    ))}
                                    {radarData.length === 0 && (
                                        <Line
                                            type="monotone"
                                            dataKey="expense"
                                            stroke="#f43f5e"
                                            strokeWidth={3}
                                            name="Total Expenses"
                                            dot={{ r: 4, strokeWidth: 2, stroke: settings.darkMode ? '#0f172a' : '#fff', fill: '#f43f5e' }}
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-none bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-black tracking-tight">Spending by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full mt-4">
                            {radarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke={chartColors.radarGrid} />
                                        <PolarAngleAxis dataKey="category" tick={{ fill: chartColors.text, fontSize: 10 }} />
                                        <PolarRadiusAxis axisLine={false} tick={false} />
                                        <Radar
                                            name="Budget"
                                            dataKey="budgeted"
                                            stroke="#3b82f6"
                                            fill="#3b82f6"
                                            fillOpacity={0.15}
                                            strokeWidth={2}
                                        />
                                        <Radar
                                            name="Actual"
                                            dataKey="actual"
                                            stroke="#f43f5e"
                                            fill="#f43f5e"
                                            fillOpacity={0.4}
                                            strokeWidth={2}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: chartColors.tooltip,
                                                border: 'none',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                            }}
                                            formatter={(value: any) => formatCurrency(Number(value), settings.currency, amountFormat)}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                    <LucideIcons.SearchX className="w-8 h-8 opacity-20" />
                                    <span className="text-xs font-medium italic">No categories found for this period</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm bg-card transition-colors">
                    <CardHeader>
                        <CardTitle className="text-lg">Category Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {radarData.map((item, index) => {
                                const overBudget = item.actual > item.budgeted && item.budgeted > 0;
                                const ratio = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
                                const IconComponent = (LucideIcons as any)[item.icon || 'Circle'];
                                const categoryColor = item.color || '#94a3b8';

                                return (
                                    <div key={index} className="flex flex-col space-y-2 p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/5 transition-colors group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                                                    style={{ backgroundColor: `${categoryColor}20` }}
                                                >
                                                    {IconComponent && <IconComponent size={16} strokeWidth={2.5} style={{ color: categoryColor }} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground/90">{item.category}</span>
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                                        {formatCurrency(item.actual, settings.currency, amountFormat)}
                                                        <span className="mx-1 opacity-50">/</span>
                                                        {formatCurrency(item.budgeted, settings.currency, amountFormat)} budget
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={cn("text-sm font-black", overBudget ? "text-rose-500" : "text-emerald-500")}>
                                                    {item.budgeted > 0 ? `${ratio.toLocaleString('en-US', { maximumFractionDigits: 0 })}%` : 'No Budget'}
                                                </div>
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
    );
};
