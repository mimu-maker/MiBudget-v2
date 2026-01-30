import { format, parseISO } from 'date-fns';

export const formatCurrency = (amount: number, currency: string = 'DKK'): string => {
    // Enforce Michael's style (x.xxx,xx kr): Dot for thousands, Comma for decimals
    const formatter = new Intl.NumberFormat('da-DK', {
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
        // Enforce Michael's style: YY/MM/DD
        return format(d, 'yy/MM/dd');
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
