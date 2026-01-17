import { format, parseISO } from 'date-fns';

export const formatCurrency = (amount: number, currency: string = 'DKK'): string => {
    // Enforce US style (x,xxx.xx) as requested: "ALWAYS show amount formatted as x,xxx.xx kr"
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return `${formatter.format(amount)} ${currency.toLowerCase() === 'dkk' ? 'kr' : currency}`;
};

export const formatDate = (date: string | Date): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? parseISO(date) : date;
        return format(d, 'yy-MM-dd');
    } catch {
        return date.toString();
    }
};

export const formatPercentage = (value: number): string => {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });

    return formatter.format(value / 100);
};
