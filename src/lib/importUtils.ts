
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

    // Clean currency symbols and spaces but keep separators, digits, minus
    clean = clean.replace(/[^\d.,-]/g, '');

    // Strip trailing dots or commas (leftover from currency symbols like "kr.")
    clean = clean.replace(/[.,]+$/, '');

    if (!clean) return 0;

    const firstComma = clean.indexOf(',');
    const lastComma = clean.lastIndexOf(',');
    const firstDot = clean.indexOf('.');
    const lastDot = clean.lastIndexOf('.');

    // SMART DETECTION: If both separators exist, we can infer the format reliably
    if (lastComma > -1 && lastDot > -1) {
        if (lastComma < lastDot) {
            // US Format: 1,234.56 or -1,234.56
            // Strategies: Remove all commas, keep dot.
            return parseFloat(clean.replace(/,/g, ''));
        } else {
            // EU Format: 1.234,56 or -1.234,56
            // Strategies: Remove all dots, replace comma with dot.
            return parseFloat(clean.replace(/\./g, '').replace(/,/g, '.'));
        }
    }

    // Only one separator type exists (or none)
    if (forceLocale === 'us') {
        // US: Commas are thousands (remove), Dots are decimal.
        return parseFloat(clean.replace(/,/g, ''));
    } else if (forceLocale === 'eu') {
        // EU: Dots are thousands (remove), Commas are decimal (replace w/ dot).
        return parseFloat(clean.replace(/\./g, '').replace(/,/g, '.'));
    }

    // Auto-detect with single separator type
    if (lastComma > -1) {
        // Has comma(s), no dot.
        // Ambiguous: "1,000" (US 1000) vs "1,23" (EU 1.23).
        // Heuristic: If multiple commas, it's definitely thousands.
        if ((clean.match(/,/g) || []).length > 1) {
            return parseFloat(clean.replace(/,/g, ''));
        }
        // Single comma. 
        // Standard CSV/Bank export often uses Local format. 
        // Default to Decimal (EU style) as it catches "cents" which are critical. 
        // If user meant thousands, they should force US locale.
        return parseFloat(clean.replace(/,/g, '.'));
    }

    if (lastDot > -1) {
        // Has dot(s), no comma.
        // Ambiguous: "1.000" (EU 1000) vs "1.23" (US 1.23).
        // Heuristic: If multiple dots, it's definitely thousands.
        if ((clean.match(/\./g) || []).length > 1) {
            return parseFloat(clean.replace(/\./g, ''));
        }
        // Single dot. Default to Decimal (US style).
        return parseFloat(clean);
    }

    // No separators
    return parseFloat(clean);
};

/**
 * Parses a date string to ISO format (YYYY-MM-DD).
 * Handles: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
 */
export const parseDate = (value: string, format: 'auto' | 'dd-mm-yyyy' | 'mm-dd-yyyy' | 'yyyy-mm-dd' = 'auto'): string => {
    if (!value) return new Date().toISOString();

    const clean = value.trim();

    // If format is specified, try to parse accordingly
    if (format === 'dd-mm-yyyy' || format === 'mm-dd-yyyy' || format === 'yyyy-mm-dd') {
        const parts = clean.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
        if (parts) {
            let day, month, year;
            if (format === 'dd-mm-yyyy') {
                day = parseInt(parts[1], 10);
                month = parseInt(parts[2], 10) - 1;
                year = parseInt(parts[3], 10);
            } else if (format === 'mm-dd-yyyy') {
                month = parseInt(parts[1], 10) - 1;
                day = parseInt(parts[2], 10);
                year = parseInt(parts[3], 10);
            } else {
                // yyyy-mm-dd
                year = parseInt(parts[1], 10);
                month = parseInt(parts[2], 10) - 1;
                day = parseInt(parts[3], 10);
            }

            if (year < 100) year += 2000;
            const date = new Date(year, month, day, 12, 0, 0);
            if (!isNaN(date.getTime())) return date.toISOString();
        }
    }

    // Fallback: Auto-detect (previous logic)
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
