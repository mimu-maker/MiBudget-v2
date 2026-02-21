import React from 'react';
import { formatCurrency } from '@/lib/formatUtils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetHealthHeaderProps {
    income: number;
    feeder: number;
    expenses: number;
    slush: number;
    currency: string;
}

export const BudgetHealthHeader = ({ income, feeder, expenses, slush, currency }: BudgetHealthHeaderProps) => {
    const totalRemaining = income + feeder - expenses - slush;
    const isPositive = totalRemaining >= 0;

    return (
        <Card className={cn(
            "relative overflow-hidden border-none shadow-2xl rounded-[2rem] transition-all duration-500",
            isPositive
                ? "bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-emerald-500/20"
                : "bg-gradient-to-br from-rose-600 via-rose-500 to-orange-600 text-white shadow-rose-500/20"
        )}>
            <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
                    {/* Main Focus: Remaining Budget */}
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                            {isPositive ? <TrendingUp className="w-10 h-10 text-white" /> : <TrendingDown className="w-10 h-10 text-white" />}
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-black uppercase tracking-[0.3em] mb-1">Remaining Budget (Annual)</p>
                            <h2 className="text-5xl font-black tracking-tighter flex items-baseline gap-2">
                                {formatCurrency(totalRemaining, currency)}
                            </h2>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                    isPositive ? "bg-white/20 text-white" : "bg-white/20 text-white"
                                )}>
                                    {isPositive ? "Surplus Plan" : "Deficit Plan"}
                                </span>
                                <span className="text-white/50 text-[10px] font-bold">Planned Annual Net Cash Flow</span>
                            </div>
                        </div>
                    </div>

                    {/* Calculation Details */}
                    <div className="flex flex-wrap justify-center lg:justify-end items-center gap-4 lg:gap-8 bg-black/10 backdrop-blur-sm rounded-3xl p-6 border border-white/10 shrink-0">
                        <div className="text-center group">
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1 group-hover:text-white/70 transition-colors">Income</p>
                            <p className="font-mono text-sm font-black whitespace-nowrap">{formatCurrency(income, currency)}</p>
                        </div>
                        <span className="text-white/20 font-black text-xl">+</span>
                        <div className="text-center group">
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1 group-hover:text-white/70 transition-colors">Feeder</p>
                            <p className="font-mono text-sm font-black whitespace-nowrap">{formatCurrency(feeder, currency)}</p>
                        </div>
                        <span className="text-white/20 font-black text-xl">-</span>
                        <div className="text-center group">
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1 group-hover:text-white/70 transition-colors">Expenses</p>
                            <p className="font-mono text-sm font-black whitespace-nowrap text-white/90">{formatCurrency(expenses, currency)}</p>
                        </div>
                        <span className="text-white/20 font-black text-xl">-</span>
                        <div className="text-center group">
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1 group-hover:text-white/70 transition-colors">Slush</p>
                            <p className="font-mono text-sm font-black whitespace-nowrap text-white/90">{formatCurrency(slush, currency)}</p>
                        </div>
                        <span className="hidden lg:inline text-white/40"><ArrowRight className="w-5 h-5" /></span>
                    </div>
                </div>
            </CardContent>

            {/* Visual Decoration */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -top-20 w-80 h-80 bg-black/5 rounded-full blur-3xl pointer-events-none" />
        </Card>
    );
};
