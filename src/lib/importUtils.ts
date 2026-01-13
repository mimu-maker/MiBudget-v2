
/**
 * Parses a string to a number, handling various formats:
 * - 1,000.00 (US/UK) -> 1000.00
 * - 1.000,00 (EU/DK) -> 1000.00
 * - 1000 (Plain) -> 1000
 * - -100 (Negative) -> -100
 */
export const parseAmount = (value: string, forceLocale: 'auto' | 'us' | 'eu' = 'auto'): number => {
    if (!value) return 0;
    let clean = value.toString().trim();

    // Clean currency symbols but keep separators
    clean = clean.replace(/[^\d.,-]/g, '');

    // FIX: Strip trailing dots or commas that might be left over from currency symbols (e.g. "kr." -> ".")
    clean = clean.replace(/[.,]+$/, '');

    if (!clean) return 0;

    if (forceLocale === 'eu') {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (forceLocale === 'us') {
        clean = clean.replace(/,/g, '');
    } else {
        // Auto-detect
        const lastComma = clean.lastIndexOf(',');
        const lastDot = clean.lastIndexOf('.');

        if (lastComma > -1 && lastDot > -1) {
            if (lastComma > lastDot) {
                // 1.000,00 (EU)
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                // 1,000.00 (US)
                clean = clean.replace(/,/g, '');
            }
        } else if (lastComma > -1) {
            // Only Commas. Treat as Decimal if European context is suspected or ambiguous.
            // Common in EU: "500,00" -> 500.00
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else if (lastDot > -1) {
            // Only Dots. "1.000".
            const dotCount = (clean.match(/\./g) || []).length;
            if (dotCount > 1) {
                // 1.000.000 -> Thousands
                clean = clean.replace(/\./g, '');
            }
            // If 1.000 (single dot) -> Ambiguous. JS default is Decimal.
        }
    }

    // Final cleanup and parse
    clean = clean.replace(/[^\d.-]/g, '');
    return parseFloat(clean) || 0;
};

/**
 * Parses a date string to ISO format (YYYY-MM-DD).
 * Handles: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
 */
export const parseDate = (value: string): string => {
    if (!value) return new Date().toISOString();

    const clean = value.trim();

    // Check if it's already ISO-like (YYYY-MM-DD...)
    // Simple check: 4 digits, dash, 2 digits...
    const isoCheck = new Date(clean);
    if (!isNaN(isoCheck.getTime()) && clean.length >= 10 && clean.indexOf('-') === 4) {
        return isoCheck.toISOString();
    }

    // Custom Parts check for DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    // Support 2-digit year: \d{2,4}
    const parts = clean.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (parts) {
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1;
        let year = parseInt(parts[3], 10);

        if (year < 100) year += 2000; // Handle 2-digit years (prefer 2000s)

        const date = new Date(year, month, day, 12, 0, 0);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }

    // Fallback: If custom parsing failed, try new Date() one last time for ANY format
    const fallback = new Date(clean);
    if (!isNaN(fallback.getTime())) return fallback.toISOString();

    console.warn(`Failed to parse date: ${value}, falling back to today.`);
    return new Date().toISOString();
};
