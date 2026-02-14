import { Tables } from "@/integrations/supabase/types";

export type SourceRule = Tables<"source_rules">;

export const SKIP_PATTERNS = ['MC/VISA', 'VISA/DANKORT', 'DANKORT', 'NETBANK', 'VISA', 'MASTERCARD', 'OVERFØRSEL', 'DEPOT', 'DK', 'K', 'CARD', 'KØB', 'AUT.', 'ONLINE', 'WWW.', 'PAYPAL', 'SUMUP', 'IZATTLE', 'GOOGLE', 'APPLE.COM', 'BILL', 'PAY', 'FORRETNING:'];

export const cleanSource = (source: string, noiseFilters: string[] = []): string => {
    if (!source) return "";

    // 1. Remove common statement separators
    let cleaned = source.split('*')[0].split('  ')[0].trim();

    // 2. Apply Custom Noise Filters (Anti-rules)
    // We strip these out wherever they appear, case-insensitively
    noiseFilters.forEach(filter => {
        if (!filter) return;
        try {
            // Escape special chars to treat as literal search unless user knows regex
            // But we'll treat them as simple strings for now to be safe
            const escaped = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'gi');
            cleaned = cleaned.replace(regex, '').trim();
        } catch (e) {
            console.warn('Invalid noise filter pattern:', filter);
        }
    });

    // 3. Fallback Hardcoded Legacy Noise Prefixes
    cleaned = cleaned.replace(/^(PAYPAL \*|SUMUP \*|IZ \*|GOOGLE \*)/i, '');

    // 4. Remove trailing/leading digits and reference numbers (e.g. "Amazon 12345", "12345 SUNSET")
    cleaned = cleaned.replace(/^[#\s]*\d+[\s-]/, '').trim(); // Start
    cleaned = cleaned.replace(/[\s#-]+\d+$/, '').trim(); // End
    cleaned = cleaned.replace(/\s+\d{4,}\s+/g, ' ').trim(); // Middle long numbers (likely refs)

    // 5. Remove common noise like ".com", etc.
    cleaned = cleaned.replace(/\.(com|co\.uk|dk|net|org)$/i, '');

    return cleaned.trim();
};

export interface ProcessedTransaction {
    clean_source: string;
    category: string;
    sub_category: string | null;
    status: 'Pending Triage' | 'Pending Person/Event' | 'Reconciled' | 'Complete';
    budget_month: string;
    budget_year: number;
    confidence: number; // 0.0 to 1.0
    planned: boolean;
    recurring: string;
    excluded: boolean;
}

export const processTransaction = (
    rawSource: string,
    rawDate: string,
    rules: any[],
    noiseFilters: string[] = []
): ProcessedTransaction => {
    const clean = cleanSource(rawSource, noiseFilters);
    const dateObj = new Date(rawDate);
    const isFuture = dateObj > new Date();

    // Default budget month to the 1st of the transaction month
    // We use string-based construction to avoid local/UTC timezone shifts
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const budgetMonth = `${year}-${month}-01`;

    const budgetYear = dateObj.getFullYear();

    const cleanLower = clean.toLowerCase();

    // 1. Try Exact Match (on Raw name first, then cleaned)
    let match = rules.find(rule =>
        (rule.source_name && rule.source_name.toLowerCase() === rawSource.toLowerCase()) ||
        (rule.clean_source_name && rule.clean_source_name.toLowerCase() === cleanLower)
    );
    let confidence = match ? 1.0 : 0.0;

    // 2. Try Prefix/Substring Match if no exact match AND rule is fuzzy
    if (!match) {
        match = rules.find(rule => {
            // Short names should not be fuzzy matched to avoid accidental broad matches
            const sourceNameRaw = rule.source_name || "";
            const cleanNameRaw = rule.clean_source_name || "";
            const ruleName = (sourceNameRaw || cleanNameRaw).toLowerCase().trim();

            // Critical: skip empty rules or pure noise rules
            if (!ruleName || ruleName.length < 2) return false;

            // If match_mode is explicitly 'exact', skip fuzzy matching
            if (rule.match_mode === 'exact') return false;

            return rawSource.toLowerCase().startsWith(ruleName) ||
                cleanLower.startsWith(ruleName) ||
                (cleanLower.length > 3 && ruleName.startsWith(cleanLower)) || // Changed cleanLower to ruleName here
                rawSource.toLowerCase().includes(ruleName);
        });
        if (match) confidence = 0.8;
    }

    if (match) {
        const category = match.auto_category || "";
        const sub_category = match.auto_sub_category || null;
        const excluded = match.auto_budget === 'Exclude';

        // Status is only Complete if skip_triage is true AND we have both category and sub-category
        // UNLESS the transaction is excluded, in which case it can be Complete
        const status = (match.skip_triage && (excluded || (category && sub_category))) ? 'Complete' : 'Pending Triage';

        return {
            clean_source: match.clean_source_name || clean,
            category: category,
            sub_category: sub_category,
            status: status as any,
            budget_month: budgetMonth,
            budget_year: budgetYear,
            confidence: confidence,
            planned: match.auto_planned ?? true,
            recurring: match.auto_recurring || (confidence === 1.0 ? 'Monthly' : 'N/A'),
            excluded: excluded
        };
    }

    return {
        clean_source: clean,
        category: "",
        sub_category: null,
        status: 'Pending Triage',
        budget_month: budgetMonth,
        budget_year: budgetYear,
        confidence: 0,
        planned: true, // Default to Planned (unplanned=N)
        recurring: 'N/A',
        excluded: false
    };
};
