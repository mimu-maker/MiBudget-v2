import { useMemo } from 'react';
import { useAllTransactions } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { usePeriod } from '@/contexts/PeriodContext';
import { getPeriodInterval } from '@/lib/dateUtils';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { da } from 'date-fns/locale';
import { useAnnualBudget } from '@/hooks/useAnnualBudget';
import { useProfile } from '@/contexts/ProfileContext';

interface UseOverviewDataProps {
    includeCore: boolean;
    includeSpecial: boolean;
    includeKlintemarken: boolean;
}


export const useOverviewData = ({ includeCore, includeSpecial, includeKlintemarken }: UseOverviewDataProps) => {
    const { data: transactions = [] } = useAllTransactions();
    const { settings } = useSettings();
    const { userProfile } = useProfile();
    const { selectedPeriod, customDateRange } = usePeriod();

    const amountFormat = userProfile?.amount_format || 'dot_decimal';
    const language = userProfile?.language || 'en-US';
    const displayLocale = language === 'da-DK' ? da : undefined;

    const effectiveInterval = useMemo(() => {
        if (selectedPeriod === 'All') {
            if (transactions.length > 0) {
                const dates = transactions.map(t => new Date(t.budget_month || t.date).getTime());
                const minDate = new Date(Math.min(...dates));
                const maxDate = new Date(Math.max(...dates));
                return {
                    start: startOfMonth(minDate),
                    end: endOfMonth(maxDate)
                };
            }
        }
        return getPeriodInterval(selectedPeriod, customDateRange);
    }, [selectedPeriod, customDateRange, transactions]);

    const currentYear = useMemo(() => {
        if (/^\d{4}$/.test(selectedPeriod)) return parseInt(selectedPeriod);

        const interval = effectiveInterval;
        const startYear = interval.start.getFullYear();
        const endYear = interval.end.getFullYear();

        if (startYear < 2022 || startYear !== endYear) return new Date().getFullYear();

        return startYear;
    }, [selectedPeriod, effectiveInterval]);

    const { budget: budgetData, loading: budgetLoading } = useAnnualBudget(currentYear);

    // Helper to get category group
    const getGroup = (catName: string | null) => {
        if (!catName) return null;
        const cat = budgetData?.categories.find(c => c.name === catName);
        return cat?.category_group;
    };

    // Base filtered transactions based on date interval
    const dateFilteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const dateStr = t.budget_month || t.date;
            const d = parseISO(dateStr);
            return isWithinInterval(d, effectiveInterval);
        });
    }, [transactions, effectiveInterval]);

    // "Flow" filtered transactions - responsive to the toggle props
    const flowFiltered = useMemo(() => {
        let filtered = dateFilteredTransactions;

        if (!includeSpecial) {
            filtered = filtered.filter(t => t.budget !== 'Special' && getGroup(t.category) !== 'special');
        }
        if (!includeKlintemarken) {
            filtered = filtered.filter(t => t.budget !== 'Klintemarken' && getGroup(t.category) !== 'klintemarken');
        }
        if (!includeCore) {
            filtered = filtered.filter(t => {
                const isSpecial = t.budget === 'Special' || getGroup(t.category) === 'special';
                const isKlintemarken = t.budget === 'Klintemarken' || getGroup(t.category) === 'klintemarken';
                // Keep only if it is one of the non-core types
                return isSpecial || isKlintemarken;
            });
        }


        filtered = filtered.filter(t => t.budget !== 'Exclude' && !t.excluded && t.status !== 'Pending Reconciliation' && !t.status?.startsWith('Pending: '));
        return filtered;
    }, [dateFilteredTransactions, includeSpecial, includeKlintemarken, budgetData]);

    // Core Summary (Income, Expense, Net) - now based on flowFiltered
    const summary = useMemo(() => {
        return flowFiltered.reduce((acc, t) => {
            if (t.amount > 0) acc.income += t.amount;
            else acc.expense += Math.abs(t.amount);
            return acc;
        }, { income: 0, expense: 0 });
    }, [flowFiltered]);

    const netIncome = summary.income - summary.expense;

    // Monthly Data for charts (using flowFiltered)
    const monthlyData = useMemo(() => {
        const interval = effectiveInterval;
        const months = eachMonthOfInterval(interval);

        return months.map(monthDate => {
            const monthLabel = format(monthDate, 'MM/yy', { locale: displayLocale });
            const fullMonthName = format(monthDate, 'MM/yyyy', { locale: displayLocale });
            const monthStart = startOfMonth(monthDate);
            const nextMonthStart = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

            const monthTransactions = flowFiltered.filter(t => {
                const dateStr = t.budget_month || t.date;
                const d = parseISO(dateStr);
                return d >= monthStart && d < nextMonthStart;
            });

            const income = monthTransactions.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);
            const expense = monthTransactions.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);

            // Subcategory contributors
            const subcategorySums: Record<string, number> = {};
            monthTransactions.forEach(t => {
                if (t.amount < 0) {
                    const sub = t.subCategory || t.category || 'Other';
                    subcategorySums[sub] = (subcategorySums[sub] || 0) + Math.abs(t.amount);
                }
            });

            const majorExpenses = Object.entries(subcategorySums)
                .sort(([, a], [, b]) => b - a)
                .filter(([, sum]) => expense > 0 && (sum / expense) > 0.25)
                .map(([name, sum]) => ({ name, sum }));

            // Category splits for line chart
            const categorySplits: Record<string, number> = {};
            monthTransactions.forEach(t => {
                if (t.amount < 0 && t.category) {
                    categorySplits[t.category] = (categorySplits[t.category] || 0) + Math.abs(t.amount);
                }
            });

            return {
                month: monthLabel,
                fullMonth: fullMonthName,
                income,
                expense,
                balance: income - expense,
                majorExpenses,
                ...categorySplits
            };
        });
    }, [flowFiltered, effectiveInterval, displayLocale]);

    // Balance Trend for Cash Flow chart
    const balanceTrend = useMemo(() => {
        let runningBalance = 0;
        const trend = monthlyData.map(d => {
            runningBalance += d.balance;
            return { ...d, cumulativeBalance: runningBalance };
        });

        const startPoint = {
            month: '',
            fullMonth: 'Start',
            income: 0,
            expense: 0,
            balance: 0,
            cumulativeBalance: 0,
            majorExpenses: []
        };

        return [startPoint, ...trend];
    }, [monthlyData]);



    // Radar Chart Data (Spending by Category)
    const radarData = useMemo(() => {
        const interval = effectiveInterval;
        const monthsInPeriod = eachMonthOfInterval(interval).length;

        const expenseCategories = budgetData?.categories.filter(cat => cat.category_group === 'expenditure') || [];
        const expenseCategoryNames = new Set(expenseCategories.map(c => c.name));

        const dataMap: Record<string, { budgeted: number; actual: number; icon?: string; color?: string }> = {};

        expenseCategories.forEach(cat => {
            dataMap[cat.name] = {
                budgeted: Math.round(cat.budget_amount * monthsInPeriod),
                actual: 0,
                icon: cat.icon,
                color: cat.color
            };
        });

        // Use flowFiltered for actuals to respect global filters
        flowFiltered.forEach(t => {
            if (t.amount < 0 && t.category && expenseCategoryNames.has(t.category)) {
                dataMap[t.category].actual += Math.abs(t.amount);
            }
        });

        return Object.entries(dataMap).map(([category, vals]) => ({
            category,
            budgeted: vals.budgeted,
            actual: Math.round(vals.actual),
            icon: vals.icon,
            color: vals.color
        })).filter(d => d.budgeted > 0 || d.actual > 0)
            .sort((a, b) => b.budgeted - a.budgeted);
    }, [budgetData, flowFiltered, effectiveInterval]);

    // Y-Axis scaling for Cash Flow chart
    const y2Data = useMemo(() => {
        const values = balanceTrend.map(d => d.cumulativeBalance);
        if (values.length === 0) return { domain: [-1000, 1000], ticks: [-1000, -500, 0, 500, 1000] };

        const absMax = Math.max(...values.map(v => Math.abs(v)), 100);
        const magnitude = Math.pow(10, Math.floor(Math.log10(absMax)));
        const firstDigit = absMax / magnitude;
        let roundedMax;
        if (firstDigit <= 1) roundedMax = 1 * magnitude;
        else if (firstDigit <= 2) roundedMax = 2 * magnitude;
        else if (firstDigit <= 5) roundedMax = 5 * magnitude;
        else roundedMax = 10 * magnitude;

        if (roundedMax < absMax * 1.1) {
            if (roundedMax === 1 * magnitude) roundedMax = 2 * magnitude;
            else if (roundedMax === 2 * magnitude) roundedMax = 5 * magnitude;
            else if (roundedMax === 5 * magnitude) roundedMax = 10 * magnitude;
            else roundedMax = 20 * magnitude;
        }

        return {
            domain: [-roundedMax, roundedMax],
            ticks: [-roundedMax, -roundedMax / 2, 0, roundedMax / 2, roundedMax]
        };
    }, [balanceTrend]);

    const lineGradientOffset = useMemo(() => {
        const values = balanceTrend.map(d => d.cumulativeBalance);
        const max = Math.max(...values, 0);
        const min = Math.min(...values, 0);
        if (max === min) return 0;
        return max / (max - min);
    }, [balanceTrend]);

    return {
        budgetLoading,
        settings,
        amountFormat,
        summary,
        netIncome,
        monthlyData,
        balanceTrend,
        radarData,
        y2Data,
        lineGradientOffset,
        budgetData,
        flowFiltered // Exposed for Sankey or other specific needs
    };
};
