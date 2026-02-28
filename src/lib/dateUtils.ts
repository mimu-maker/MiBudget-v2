import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears, isWithinInterval, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

export type Period =
    | 'All'
    | 'This month'
    | 'Last Month'
    | 'This Quarter'
    | 'Last Quarter'
    | 'This Year'
    | 'Last Year'
    | 'Year to Date'
    | 'Last 6M'
    | 'Custom'
    | string;

export const getPeriodInterval = (period: Period, customRange?: DateRange): { start: Date; end: Date } => {
    const now = new Date();

    if (/^\d{4}$/.test(period)) {
        const year = parseInt(period);
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59);
        return { start, end: end > now ? now : end }; // Cap year to current day if it's the current or future year
    }

    switch (period) {
        case 'All':
            return { start: new Date(2000, 0, 1), end: now };
        case 'Custom':
            if (customRange?.from) {
                const to = customRange.to || customRange.from;
                return {
                    start: customRange.from,
                    end: to > now ? now : to
                };
            }
            return { start: startOfYear(now), end: now }; // Fallback
        case 'This month':
            return { start: startOfMonth(now), end: now };
        case 'Last Month':
            const lastMonth = subMonths(now, 1);
            return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        case 'This Quarter':
            return { start: startOfQuarter(now), end: now };
        case 'Last Quarter':
            const lastQuarter = subQuarters(now, 1);
            return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
        case 'This Year':
        case 'Year to Date':
            return { start: startOfYear(now), end: now };
        case 'Last Year':
            const lastYear = subYears(now, 1);
            return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
        case 'Last 6M':
            const sixMonthsAgo = subMonths(now, 5);
            return { start: startOfMonth(sixMonthsAgo), end: now };
        default:
            // This block handles cases where 'period' might be a year string,
            // but the initial check already covers it.
            // This default fallback ensures a valid interval is always returned.
            return { start: startOfYear(now), end: now };
    }
};

export const filterByBudgetDate = <T extends { date: string, budget_month?: string | null }>(items: T[], period: Period, customRange?: DateRange): T[] => {
    const interval = getPeriodInterval(period, customRange);
    return items.filter(item => {
        try {
            // Use budget_month if available (YYYY-MM-01 format), otherwise fallback to date
            const dateStr = item.budget_month || item.date;
            const date = parseISO(dateStr);
            return isWithinInterval(date, interval);
        } catch (e) {
            return false;
        }
    });
};

export const filterByPeriod = <T extends { date: string }>(items: T[], period: Period, customRange?: DateRange): T[] => {
    const interval = getPeriodInterval(period, customRange);
    return items.filter(item => {
        try {
            const date = parseISO(item.date);
            return isWithinInterval(date, interval);
        } catch (e) {
            return false;
        }
    });
};
