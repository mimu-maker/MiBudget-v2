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

export const formatDate = (
    date: string | Date,
    showTime: boolean = false,
    dateFormat: string = 'YY/MM/DD'
): string => {
    if (!date) return '';
    try {
        let d: Date;
        if (typeof date === 'string') {
            // Try parseISO first, then fallback to new Date() if it looks like a manual format or has space
            d = parseISO(date);
            if (isNaN(d.getTime())) {
                d = new Date(date);
            }
        } else {
            d = date;
        }

        if (isNaN(d.getTime())) return date.toString();

        // Map UI format strings to date-fns format strings
        let baseFormat = 'yy/MM/dd';
        if (dateFormat === 'DD/MM/YYYY') baseFormat = 'dd/MM/yyyy';
        if (dateFormat === 'YYYY-MM-DD') baseFormat = 'yyyy-MM-dd';

        return format(d, showTime ? `${baseFormat} HH:mm` : baseFormat);
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
