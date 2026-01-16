
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears, isWithinInterval, parseISO } from 'date-fns';

export type Period =
    | 'This month'
    | 'Last Month'
    | 'This Quarter'
    | 'Last Quarter'
    | 'This Year'
    | 'Last Year'
    | '2023'
    | '2024'
    | '2025'
    | '2026';

export const getPeriodInterval = (period: Period): { start: Date; end: Date } => {
    const now = new Date();

    switch (period) {
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
        case '2023':
            return { start: new Date(2023, 0, 1), end: new Date(2023, 11, 31, 23, 59, 59) };
        case '2024':
            return { start: new Date(2024, 0, 1), end: new Date(2024, 11, 31, 23, 59, 59) };
        case '2025':
            return { start: new Date(2025, 0, 1), end: new Date(2025, 11, 31, 23, 59, 59) };
        case '2026':
            return { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31, 23, 59, 59) };
        default:
            return { start: startOfYear(now), end: endOfYear(now) };
    }
};

export const filterByPeriod = <T extends { date: string }>(items: T[], period: Period): T[] => {
    const interval = getPeriodInterval(period);
    return items.filter(item => {
        try {
            const date = parseISO(item.date);
            return isWithinInterval(date, interval);
        } catch (e) {
            return false;
        }
    });
};
