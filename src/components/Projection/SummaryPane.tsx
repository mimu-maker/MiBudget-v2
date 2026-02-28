import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatUtils";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, Cell, YAxis } from "recharts";
import { LucideIcon } from "lucide-react";

interface SummaryPaneProps {
    title: string;
    value: number;
    data: number[];
    color: 'green' | 'red' | 'yellow';
    icon: LucideIcon;
    currency: string;
}

const SummaryPane = ({ title, value, data, color, icon: Icon, currency }: SummaryPaneProps) => {
    const colors = {
        green: {
            bg: "bg-white",
            text: "text-emerald-500",
            value: "text-emerald-600",
            chart: "#10b981",
            iconBg: "bg-emerald-50",
            icon: "text-emerald-500",
            track: "bg-emerald-50/50"
        },
        red: {
            bg: "bg-white",
            text: "text-rose-500",
            value: "text-rose-600",
            chart: "#f43f5e",
            iconBg: "bg-rose-50",
            icon: "text-rose-500",
            track: "bg-rose-50/50"
        },
        yellow: {
            bg: "bg-white",
            text: "text-amber-500",
            value: "text-amber-600",
            chart: "#f59e0b",
            iconBg: "bg-amber-50",
            icon: "text-amber-500",
            track: "bg-amber-50/50"
        }
    };

    const theme = colors[color];
    const isDynamic = data.some(v => v < 0);
    const chartData = data.map(v => ({ value: isDynamic ? v : Math.abs(v) }));

    // Find max for YAxis to ensure bars fill nicely but scaled
    const maxVal = Math.max(...data.map(Math.abs), 1);

    const getFillColor = (value: number) => {
        if (!isDynamic) return theme.chart;
        return value >= 0 ? colors.green.chart : colors.red.chart;
    };

    return (
        <Card className={cn("border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden flex flex-col", theme.bg)}>
            <div className="p-6 pb-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-slate-400">{title}</p>
                        <h3 className={cn("text-3xl font-black tabular-nums tracking-tighter", theme.value)}>
                            {formatCurrency(value, currency)}
                        </h3>
                    </div>
                    <div className={cn("p-2.5 rounded-2xl", theme.iconBg, theme.icon)}>
                        <Icon size={20} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            <div className={cn("h-16 mt-auto w-full relative pt-1", theme.track)}>
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent z-10" />
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="15%">
                        <YAxis hide domain={isDynamic ? [-maxVal * 1.1, maxVal * 1.1] : [0, maxVal * 1.1]} />
                        <Bar
                            dataKey="value"
                            radius={[2, 2, 2, 2]}
                            minPointSize={2}
                        >
                            {chartData.map((entry, index) => {
                                const opacity = 0.2 + (Math.abs(entry.value) / maxVal) * 0.8;
                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={getFillColor(entry.value)}
                                        fillOpacity={opacity}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default SummaryPane;
