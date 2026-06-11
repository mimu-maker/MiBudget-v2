import { useMemo } from 'react';
import { useAllTransactions } from '@/components/Transactions/hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { usePeriod } from '@/contexts/PeriodContext';
import { getPeriodInterval } from '@/lib/dateUtils';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, eachWeekOfInterval, startOfWeek } from 'date-fns';
import { da } from 'date-fns/locale';
import { useAnnualBudget } from '@/hooks/useAnnualBudget';
import { useProfile } from '@/contexts/ProfileContext';

interface UseOverviewDataProps {
    includeCore: boolean;
    includeSpecial: boolean;
    includeKlintemarken?: boolean;
}

export const useOverviewData = ({ includeCore, includeSpecial, includeKlintemarken = false }: UseOverviewDataProps) => {
    const { data: transactions = [] } = useAllTransactions();
    const { settings } = useSettings();
    const { userProfile } = useProfile();
    const { selectedPeriod, customDateRange } = usePeriod();

    const amountFormat = userProfile?.amount_format || 'dot_decimal';
    const language = userProfile?.language || 'en-US';
    const displayLocale = language === 'da-DK' ? da : undefined;

    const effectiveInterval = useMemo(() => {
        const now = new Date();
        if (selectedPeriod === 'All') {
            if (transactions.length > 0) {
                const dates = transactions.map(t => new Date(t.budget_month || t.date).getTime());
                const minDate = new Date(Math.min(...dates));
                let maxDate = new Date(Math.max(...dates));

                // Cap to now
                if (maxDate > now) maxDate = now;

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
        const is90d = selectedPeriod === '90d';
        return transactions.filter(t => {
            const dateStr = is90d ? t.date : (t.budget_month || t.date);
            const d = parseISO(dateStr);
            return isWithinInterval(d, effectiveInterval);
        });
    }, [transactions, effectiveInterval, selectedPeriod]);

    // "Flow" filtered transactions - responsive to the toggle props
    const flowFiltered = useMemo(() => {
        let filtered = dateFilteredTransactions;

        if (!includeSpecial) {
            filtered = filtered.filter(t => t.budget !== 'Special' && t.category?.toLowerCase() !== 'slush fund' && getGroup(t.category) !== 'special');
        }

        // Core filtering — income group is also a Core concept, exclude it when Core is off
        if (!includeCore) {
            filtered = filtered.filter(t => getGroup(t.category) !== 'expenditure' && getGroup(t.category) !== 'income');
        }

        // Klintemarken transactions - respect toggle if passed, otherwise hide (relic removal)
        if (!includeKlintemarken) {
            filtered = filtered.filter(t => t.budget !== 'Klintemarken' && getGroup(t.category) !== 'klintemarken');
        }

        filtered = filtered.filter(t => {
            // Always hide Pending Reconciliation — income and expenses alike
            if (t.status === 'Pending Reconciliation' || t.status?.startsWith('Pending: ')) return false;
            // Income: show regardless of excluded/budget flags — only pending recon is suppressed
            const group = getGroup(t.category);
            if (group === 'income' || (includeKlintemarken && group === 'klintemarken')) return true;
            // Expenses/other: standard exclusion rules
            return t.budget !== 'Exclude' && !t.excluded;
        });

        // Exclude uncategorized transactions from all chart/KPI aggregations
        filtered = filtered.filter(t => t.category && t.category !== 'Uncategorized');

        return filtered;
    }, [dateFilteredTransactions, includeCore, includeSpecial, includeKlintemarken, budgetData]);

    // Core Summary (Income, Expense, Net) - now based on flowFiltered
    const summary = useMemo(() => {
        return flowFiltered.reduce((acc, t) => {
            const group = getGroup(t.category);
            // Positive special-group amounts count as income when Slush toggle is on
            const isIncome = group === 'income'
                || (includeKlintemarken && group === 'klintemarken')
                || (includeSpecial && group === 'special' && t.amount > 0);
            if (isIncome && t.amount > 0) {
                acc.income += t.amount;
            } else if (t.amount < 0) {
                acc.expense += Math.abs(t.amount);
            } else {
                // positive amount in non-income category (refund/reimbursement) = expense offset
                acc.expense = Math.max(0, acc.expense - t.amount);
            }
            return acc;
        }, { income: 0, expense: 0 });
    }, [flowFiltered, budgetData, includeKlintemarken, includeSpecial]);

    const netIncome = summary.income - summary.expense;

    // Monthly Data for charts (using flowFiltered)
    const monthlyData = useMemo(() => {
        const interval = effectiveInterval;
        const is90d = selectedPeriod === '90d';

        const periods = is90d
            ? eachWeekOfInterval(interval, { weekStartsOn: 1 })
            : eachMonthOfInterval(interval);

        return periods.map(periodDate => {
            const monthLabel = is90d
                ? `W${format(periodDate, 'I')}/${format(periodDate, 'RR').slice(2)}`
                : format(periodDate, 'MM/yy', { locale: displayLocale });
            const fullMonthName = is90d
                ? `Week ${format(periodDate, 'I, yyyy')}`
                : format(periodDate, 'MM/yyyy', { locale: displayLocale });

            const periodStart = is90d
                ? startOfWeek(periodDate, { weekStartsOn: 1 })
                : startOfMonth(periodDate);
            const nextPeriodStart = is90d
                ? new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + 7)
                : new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1);

            const monthTransactions = flowFiltered.filter(t => {
                const dateStr = is90d ? t.date : (t.budget_month || t.date);
                const d = parseISO(dateStr);
                return d >= periodStart && d < nextPeriodStart;
            });

            const { income, expense } = monthTransactions.reduce((acc, t) => {
                const group = getGroup(t.category);
                // Positive special-group amounts count as income when Slush toggle is on
                const isIncome = group === 'income'
                    || (includeKlintemarken && group === 'klintemarken')
                    || (includeSpecial && group === 'special' && t.amount > 0);
                if (isIncome && t.amount > 0) {
                    acc.income += t.amount;
                } else if (t.amount < 0) {
                    acc.expense += Math.abs(t.amount);
                } else {
                    acc.expense = Math.max(0, acc.expense - t.amount);
                }
                return acc;
            }, { income: 0, expense: 0 });

            // Category splits for line chart
            const categorySplits: Record<string, number> = {};
            monthTransactions.forEach(t => {
                if (t.amount < 0 && t.category) {
                    categorySplits[t.category] = (categorySplits[t.category] || 0) + Math.abs(t.amount);
                }
            });

            // Sub-category splits per category (for drill-down drawer)
            const subCategorySplits: Record<string, Record<string, number>> = {};
            monthTransactions.forEach(t => {
                if (t.amount < 0 && t.category && t.sub_category) {
                    if (!subCategorySplits[t.category]) subCategorySplits[t.category] = {};
                    subCategorySplits[t.category][t.sub_category] =
                        (subCategorySplits[t.category][t.sub_category] || 0) + Math.abs(t.amount);
                }
            });

            // Subcategory sums (fallback for majorExpenses when no individual tx exists)
            // Also excludes Property (mortgage/loans) to match priority-1 filter
            const subcategorySums: Record<string, number> = {};
            monthTransactions.forEach(t => {
                if (t.amount < 0 && t.category !== 'Property') {
                    const sub = t.sub_category || t.category || 'Other';
                    subcategorySums[sub] = (subcategorySums[sub] || 0) + Math.abs(t.amount);
                }
            });

            // Major Expenses: priority 1 = individual tx, 2 = subcategory totals, 3 = category totals
            // Exclude Property (mortgage, BoligLån, loans) — fixed committed, not useful in hover
            const expenseTransactions = monthTransactions
                .filter(t => t.amount < 0 && t.category !== 'Property')
                .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

            // Stretch to 5 items if ≥3 Discretionary transactions > 2000 DKK
            const discretionaryLarge = expenseTransactions.filter(t =>
                Math.abs(t.amount) > 2000 &&
                budgetData?.categories.find(c => c.name === t.category)?.label === 'Discretionary'
            );
            const expenseLimit = discretionaryLarge.length >= 3 ? 5 : 3;

            let majorExpenses: { name: string; sum: number }[];
            if (expenseTransactions.length > 0) {
                majorExpenses = expenseTransactions.slice(0, expenseLimit).map(t => ({
                    name: t.clean_source || t.source || 'Unknown',
                    sum: Math.abs(t.amount)
                }));
            } else {
                const subEntries = Object.entries(subcategorySums)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, expenseLimit);
                if (subEntries.length > 0) {
                    majorExpenses = subEntries.map(([name, sum]) => ({ name, sum }));
                } else {
                    majorExpenses = Object.entries(categorySplits)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, expenseLimit)
                        .map(([name, sum]) => ({ name, sum }));
                }
            }

            // Notable income: income > 1000 DKK, excluding salary sub-categories
            const notableIncome = monthTransactions
                .filter(t => {
                    const group = getGroup(t.category);
                    if (!(group === 'income' || (includeKlintemarken && group === 'klintemarken'))) return false;
                    if (t.amount <= 1000) return false;
                    // Exclude salary lines (Salary - Michael, Salary - Tanja, etc.)
                    if (t.sub_category?.toLowerCase().includes('salary')) return false;
                    return true;
                })
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map(t => ({ name: t.clean_source || t.source || 'Income', sum: t.amount }));

            return {
                month: monthLabel,
                fullMonth: fullMonthName,
                income,
                expense,
                balance: income - expense,
                majorExpenses,
                notableIncome,
                subCategorySplits,
                ...categorySplits
            };
        });
    }, [flowFiltered, effectiveInterval, displayLocale, budgetData, includeKlintemarken]);

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
            majorExpenses: [],
            notableIncome: []
        };

        return [startPoint, ...trend];
    }, [monthlyData]);



    // Radar Chart Data (Spending by Category)
    const radarData = useMemo(() => {
        const interval = effectiveInterval;
        const monthsInPeriod = eachMonthOfInterval(interval).length;

        const expenseCategories = budgetData?.categories.filter(cat => {
            if (cat.category_group === 'expenditure') return includeCore;
            if (cat.category_group === 'special') return includeSpecial;
            if (cat.category_group === 'klintemarken') return false; // Feeder budget removed
            return false;
        }) || [];
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
    }, [budgetData, flowFiltered, effectiveInterval, includeCore, includeSpecial]);

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
