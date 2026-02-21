import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, RefreshCcw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BudgetSummaryCardsProps {
    currency: string;
    income: number;
    expenses: number;
    slush: number;
    feeder: number;
}

export const BudgetSummaryCards = ({
    currency,
    income,
    expenses,
    slush,
    feeder
}: BudgetSummaryCardsProps) => {
    const totalRemaining = income + feeder - expenses - slush;
    const isPositive = totalRemaining >= 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 mt-2">
            {/* 1. Income */}
            <Link to="/projection" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-900 dark:to-emerald-950/10 h-full">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 rounded-full" />
                    <CardHeader className="pb-1 pt-4 px-5">
                        <CardTitle className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Projected Income</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                            {formatCurrency(income, currency)}
                        </div>
                    </CardContent>
                </Card>
            </Link>

            {/* 2. Feeder Budgets */}
            <Link to="/projection" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-900 dark:to-blue-950/10 h-full">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 rounded-full" />
                    <CardHeader className="pb-1 pt-4 px-5">
                        <CardTitle className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Projected Feeder</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                        <div className="text-2xl font-black text-blue-700 dark:text-blue-400 tracking-tight">
                            {formatCurrency(feeder, currency)}
                        </div>
                    </CardContent>
                </Card>
            </Link>

            {/* 3. Expenses */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-white to-rose-50/50 dark:from-slate-900 dark:to-rose-950/10">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/50 rounded-full" />
                <CardHeader className="pb-1 pt-4 px-5">
                    <CardTitle className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-1">Budgeted Expenses</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                    <div className="text-2xl font-black text-rose-700 dark:text-rose-400 tracking-tight">
                        {formatCurrency(expenses, currency)}
                    </div>
                </CardContent>
            </Card>

            {/* 4. Slush Fund */}
            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-900 dark:to-purple-950/10">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50 rounded-full" />
                <CardHeader className="pb-1 pt-4 px-5">
                    <CardTitle className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] mb-1">Budgeted Slush</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                    <div className="text-2xl font-black text-purple-700 dark:text-purple-400 tracking-tight">
                        {formatCurrency(slush, currency)}
                    </div>
                </CardContent>
            </Card>

            {/* 5. Total Remaining */}
            <Card className={cn(
                "relative overflow-hidden border-none shadow-xl transition-all duration-500",
                isPositive
                    ? "bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 text-white"
                    : "bg-gradient-to-br from-rose-600 via-rose-500 to-orange-600 text-white"
            )}>
                <CardHeader className="pb-1 pt-4 px-5 text-center">
                    <CardTitle className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em] mb-1 flex justify-center items-center gap-2">
                        Remaining
                        <span className="bg-white/20 text-white text-[8px] font-black px-1.5 h-4 rounded flex items-center">
                            {isPositive ? "SURPLUS" : "DEFICIT"}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 text-center">
                    <div className="text-2xl font-black tracking-tighter">
                        {formatCurrency(totalRemaining, currency)}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
