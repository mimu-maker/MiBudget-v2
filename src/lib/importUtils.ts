/**
 * Parses a string to a number, handling various formats.
 * Enforces rounding to 2 decimal places to ensure data integrity.
 */
export const parseAmount = (value: string): number | null => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Math.round(value * 100) / 100;

    let clean = value.toString().trim();

    // Clean currency symbols and spaces but keep separators, digits, minus
    clean = clean.replace(/[^\d.,-]/g, '');
    clean = clean.replace(/[.,]+$/, '');

    if (!clean) return null;

    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');

    let result: number;
    if (lastComma > -1 && lastDot > -1) {
        if (lastComma < lastDot) {
            // US Format: 1,234.56
            result = parseFloat(clean.replace(/,/g, ''));
        } else {
            // EU Format: 1.234,56
            result = parseFloat(clean.replace(/\./g, '').replace(/,/g, '.'));
        }
    } else if (lastComma > -1) {
        // Heuristic: if single comma and only 2 digits after, likely decimal
        const parts = clean.split(',');
        if (parts.length === 2 && parts[1].length <= 2 && (clean.match(/,/g) || []).length === 1) {
            result = parseFloat(clean.replace(/,/g, '.'));
        } else {
            result = parseFloat(clean.replace(/,/g, ''));
        }
    } else if (lastDot > -1) {
        // Heuristic: if single dot and only 2 digits after, likely decimal
        const parts = clean.split('.');
        if (parts.length === 2 && parts[1].length <= 2 && (clean.match(/\./g) || []).length === 1) {
            result = parseFloat(clean);
        } else {
            result = parseFloat(clean.replace(/\./g, ''));
        }
    } else {
        result = parseFloat(clean);
    }

    if (isNaN(result)) return null;
    return Math.round(result * 100) / 100;
};

/**
 * Parses a date string to ISO format (YYYY-MM-DD).
 * Enforces YYYY-MM-DD internally for reliable sorting.
 */
export const parseDate = (value: string): string | null => {
    if (!value) return null;

    const clean = value.trim();

    // Try to catch common formats
    // Matches DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY
    const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (dmy) {
        let day = parseInt(dmy[1], 10);
        let month = parseInt(dmy[2], 10);
        let year = parseInt(dmy[3], 10);
        if (year < 100) year += 2000;
        const date = new Date(year, month - 1, day, 12, 0, 0);
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }

    // Matches YYYY.MM.DD, YYYY-MM-DD, YYYY/MM/DD
    const ymd = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymd) {
        let year = parseInt(ymd[1], 10);
        let month = parseInt(ymd[2], 10);
        let day = parseInt(ymd[3], 10);
        const date = new Date(year, month - 1, day, 12, 0, 0);
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }

    const fallback = new Date(clean);
    if (!isNaN(fallback.getTime())) return fallback.toISOString().split('T')[0];

    return null;
};

