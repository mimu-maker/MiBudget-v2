import { format, parseISO } from 'date-fns';

// Helper for centralizing number style based on user preference
export const formatNumber = (
    value: number,
    format: 'comma_decimal' | 'dot_decimal' = 'dot_decimal',
    minDecimals = 2,
    maxDecimals = 2
): string => {
    // US/UK: 1,000.00 (dot decimal)
    // Danish: 1.000,00 (comma decimal)
    const locale = format === 'comma_decimal' ? 'da-DK' : 'en-US';

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
    }).format(value);
};

export const formatCurrency = (
    amount: number,
    currency: string = 'DKK',
    format: 'comma_decimal' | 'dot_decimal' = 'dot_decimal'
): string => {
    const formatted = formatNumber(amount, format);
    const suffix = currency.toLowerCase() === 'dkk' ? 'kr' : currency;
    return `${formatted} ${suffix}`;
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

export const formatBudgetMonth = (date: string | null): string => {
    if (!date) return 'No Date';
    try {
        const d = parseISO(date);
        return format(d, 'MMM yy');
    } catch {
        return date;
    }
};

export const formatPercentage = (
    value: number,
    format: 'comma_decimal' | 'dot_decimal' = 'dot_decimal'
): string => {
    const locale = format === 'comma_decimal' ? 'da-DK' : 'en-US';
    const formatted = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value);

    return `${formatted}%`;
};
