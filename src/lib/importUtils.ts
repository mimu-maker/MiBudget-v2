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

    let clean = value.trim();
    console.log(`Attempting to parse date: "${clean}"`);

    // 1. Try YYYY.MM.DD first (most specific)
    const ymd = clean.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
        let year = parseInt(ymd[1], 10);
        let month = parseInt(ymd[2], 10);
        let day = parseInt(ymd[3], 10);
        const date = new Date(year, month - 1, day, 12, 0, 0);
        if (!isNaN(date.getTime())) {
            const result = date.toISOString().split('T')[0];
            console.log(`Parsed YMD format: "${clean}" -> "${result}" (from ${ymd[0]})`);
            return result;
        }
    }

    // 2. Try DD.MM.YYYY (or YY)
    // We look for a 1-2 digit start, followed by separators, then another 1-2 digits, then 2 or 4 digits.
    // To avoid matching "20" from "2025", we can try to find a full pattern.
    const dmy = clean.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (dmy) {
        let day = parseInt(dmy[1], 10);
        let month = parseInt(dmy[2], 10);
        let year = parseInt(dmy[3], 10);

        // Handle 2-digit years: assume 2000-2049, 1950-1999
        if (year < 100) {
            year += (year < 50) ? 2000 : 1900;
        }

        const date = new Date(year, month - 1, day, 12, 0, 0);
        if (!isNaN(date.getTime())) {
            const result = date.toISOString().split('T')[0];
            console.log(`Parsed DMY format: "${clean}" -> "${result}" (from ${dmy[0]})`);
            return result;
        }
    }

    // Try native Date constructor as last resort
    const cleanForNative = clean.replace(/["']/g, '').trim();
    const fallback = new Date(cleanForNative);
    if (!isNaN(fallback.getTime())) {
        const result = fallback.toISOString().split('T')[0];
        console.log(`Parsed fallback format: "${clean}" -> "${result}"`);
        return result;
    }

    console.error(`Failed to parse date: "${clean}"`);
    return null;
};

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching column headers to field names
 */
export const levenshteinDistance = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const matrix: number[][] = [];

    for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[s2.length][s1.length];
};

/**
 * Calculate similarity score between two strings (0-1, higher is better)
 */
export const stringSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
};

/**
 * Find best matching field for a CSV header using fuzzy matching
 * Returns null if no good match found (similarity < 0.6)
 */

export const fuzzyMatchField = (
    header: string,
    possibleFields: string[],
    threshold: number = 0.6
): string | null => {
    const normalized = header.toLowerCase().replace(/[^a-z]/g, '');
    console.log(`Fuzzy matching header: "${header}" -> "${normalized}"`);
    console.log('Available fields:', possibleFields);

    let bestMatch: string | null = null;
    let bestScore = threshold;

    for (const field of possibleFields) {
        const fieldNormalized = field.toLowerCase().replace(/[^a-z]/g, '');

        // Check for exact match or substring
        if (normalized === fieldNormalized ||
            normalized.includes(fieldNormalized) ||
            fieldNormalized.includes(normalized)) {
            console.log(`Exact match found: "${header}" -> "${field}"`);
            return field;
        }

        // Calculate similarity
        const score = stringSimilarity(normalized, fieldNormalized);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = field;
        }
    }

    console.log(`Best match for "${header}": "${bestMatch}" (score: ${bestScore})`);
    return bestMatch;
};

