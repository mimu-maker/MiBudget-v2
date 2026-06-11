import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatUtils";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SummaryPaneProps {
    title: string;
    value: number;
    color: 'green' | 'red' | 'yellow';
    icon: LucideIcon;
    currency: string;
}

const SummaryPane = ({ title, value, color, icon: Icon, currency }: SummaryPaneProps) => {
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

    return (
        <Card className={cn("border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden", theme.bg)}>
            <div className="p-6">
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
        </Card>
    );
};

export default SummaryPane;
