import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatUtils';

interface BudgetSummaryCardsProps {
    selectedYear: number;
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    monthlyContribution: number;
    projectedIncome: number;
}

export const BudgetSummaryCards = ({
    selectedYear,
    totalBudget,
    totalSpent,
    totalRemaining,
    monthlyContribution,
    projectedIncome
}: BudgetSummaryCardsProps) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    // Calculate YTD values
    // If selectedYear is currentYear, use current month, otherwise use 12
    const isPastYear = selectedYear < currentYear;
    const projectionMonths = selectedYear === currentYear ? currentMonth : 12;
    const ytdBudget = monthlyContribution * projectionMonths;
    const ytdRemaining = ytdBudget - totalSpent;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-4">
            <Card className="border-t-4 border-t-emerald-500 shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Actual Income
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <div className="text-2xl font-bold text-emerald-600">{formatCurrency(projectedIncome)}</div>
                        <div className="text-xs text-gray-500">
                            Realized from Completed Transactions
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-blue-500 shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Budget {isPastYear ? "" : "(YTD)"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(ytdBudget)}</div>
                        <div className="flex flex-col text-xs text-gray-500 gap-0.5">
                            {!isPastYear && <span>Full Year: {formatCurrency(totalBudget)}</span>}
                            <span>Monthly: {formatCurrency(monthlyContribution)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-t-4 border-t-rose-500 shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest">Actual Spend {isPastYear ? "" : "(YTD)"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalSpent)}</div>
                        <div className="text-xs text-gray-500">
                            Avg Monthly: {formatCurrency(totalSpent / Math.max(projectionMonths, 1))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className={`border-t-4 ${ytdRemaining >= 0 ? 'border-t-emerald-500' : 'border-t-rose-500'} shadow-md transition-all duration-300`}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-widest flex justify-between items-center">
                        Remaining {isPastYear ? "" : "(YTD)"}
                        {ytdRemaining < 0 ? (
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-black">OVER</span>
                        ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black">UNDER</span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <div className={`text-2xl font-bold ${ytdRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(ytdRemaining)}
                        </div>
                        <div className="flex flex-col text-xs text-gray-400 font-medium gap-0.5">
                            <span className={ytdRemaining < 0 ? 'text-rose-400' : ''}>
                                {ytdRemaining < 0
                                    ? `${formatCurrency(Math.abs(ytdRemaining))} over ${isPastYear ? 'target' : 'YTD target'}`
                                    : `${formatCurrency(ytdRemaining)} ahead of target`
                                }
                            </span>
                            {!isPastYear && <span>Full Year Remaining: {formatCurrency(totalRemaining)}</span>}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
