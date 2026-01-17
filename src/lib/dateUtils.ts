import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears, isWithinInterval, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

export type Period =
    | 'This month'
    | 'Last Month'
    | 'This Quarter'
    | 'Last Quarter'
    | 'This Year'
    | 'Last Year'
    | 'Year to Date'
    | 'Custom'
    | string;

export const getPeriodInterval = (period: Period, customRange?: DateRange): { start: Date; end: Date } => {
    const now = new Date();

    if (/^\d{4}$/.test(period)) {
        const year = parseInt(period);
        return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) };
    }

    switch (period) {
        case 'Custom':
            if (customRange?.from) {
                return { start: customRange.from, end: customRange.to || customRange.from };
            }
            return { start: startOfYear(now), end: endOfYear(now) }; // Fallback
        case 'This month':
            return { start: startOfMonth(now), end: endOfMonth(now) };
        case 'Last Month':
            const lastMonth = subMonths(now, 1);
            return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        case 'This Quarter':
            return { start: startOfQuarter(now), end: endOfQuarter(now) };
        case 'Last Quarter':
            const lastQuarter = subQuarters(now, 1);
            return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
        case 'This Year':
            return { start: startOfYear(now), end: endOfYear(now) };
        case 'Last Year':
            const lastYear = subYears(now, 1);
            return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
        case 'Year to Date':
            return { start: startOfYear(now), end: now };
        default:
            return { start: startOfYear(now), end: endOfYear(now) };
    }
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
