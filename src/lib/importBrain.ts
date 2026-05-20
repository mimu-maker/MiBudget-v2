import { Tables } from "@/integrations/supabase/types";

export type ClassificationRule = Tables<"classification_rules">;

export const SKIP_PATTERNS = ['MC/VISA', 'VISA/DANKORT', 'DANKORT', 'NETBANK', 'VISA', 'MASTERCARD', 'OVERFØRSEL', 'DEPOT', 'DK', 'K', 'CARD', 'KØB', 'AUT.', 'ONLINE', 'WWW.', 'PAYPAL', 'SUMUP', 'IZATTLE', 'GOOGLE', 'APPLE.COM', 'BILL', 'PAY', 'FORRETNING:', 'BS', 'BS '];

// Payment wrappers where the entity is AFTER the *, not before.
// "MOBILEPAY *TOVE BOJESEN 294" → entity is "TOVE BOJESEN", not "MOBILEPAY"
const WRAPPER_PREFIXES = ['MOBILEPAY', 'PAYPAL', 'SUMUP', 'IZ', 'GOOGLE', 'APPLE.COM/BILL', 'APPLE.COM'];

export const cleanSource = (source: string, noiseFilters: string[] = []): string => {
    if (!source) return "";

    // 1. Handle * separator — direction depends on whether this is a wrapper transaction
    //    Wrappers: entity is AFTER *  (MOBILEPAY *TOVE BOJESEN → "TOVE BOJESEN")
    //    Others:   entity is BEFORE * (AMAZON *REF12345 → "AMAZON")
    let cleaned: string;
    // Strip "Forretning: " prefix before wrapper detection so
    // "Forretning: SumUp *DanShop" is correctly identified as a wrapper
    const strippedForWrapper = source.replace(/^Forretning:\s*/i, '').trim();
    const upperSource = strippedForWrapper.toUpperCase();
    const isWrapper = WRAPPER_PREFIXES.some(p => upperSource.startsWith(p));

    if (isWrapper && strippedForWrapper.includes('*')) {
        // Take everything after the first *
        cleaned = strippedForWrapper.split('*').slice(1).join('*').trim();
        // Strip trailing amounts: "TOVE BOJESEN 294" → "TOVE BOJESEN"
        // Handles integers (294), decimals (294.00), and Danish comma format (294,00)
        cleaned = cleaned.replace(/\s+\d+([.,]\d{1,2})?$/, '').trim();
    } else {
        cleaned = source.split('*')[0].trim();
    }

    // Strip double-space separators (bank statement artifact)
    cleaned = cleaned.split('  ')[0].trim();

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

    // 3. Hardcoded noise prefixes — Danish bank reference patterns and remaining wrappers
    // Note: MOBILEPAY/PAYPAL/SUMUP/GOOGLE wrapper cases are already handled in step 1
    // These handle cases where the wrapper had no * (e.g. "Forretning: Ni Hao" direct)
    cleaned = cleaned.replace(/^Forretning:\s*/i, '');          // "Forretning: Ni Hao" → "Ni Hao"
    cleaned = cleaned.replace(/^DK-[A-Z]+\d+\s*/i, '');        // "DK-NOTAC3886 BILKA ..." → "BILKA ..."
    cleaned = cleaned.replace(/^-[A-Z]+\d+\s*/i, '');          // "-NOTAC3886 BILKA ..." → "BILKA ..."
    cleaned = cleaned.replace(/^BS\s+/i, '');                   // "BS " prefix (Betalingsservice)
    cleaned = cleaned.trim();

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
    secondary_categories: string[];
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
    rules: ClassificationRule[],
    noiseFilters: string[] = [],
    sourceSettings: any[] = []
): ProcessedTransaction => {
    const clean = cleanSource(rawSource, noiseFilters);
    const dateObj = new Date(rawDate);
 
    // Default budget month to the 1st of the transaction month
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const budgetMonth = `${year}-${month}-01`;
    const budgetYear = dateObj.getFullYear();
 
    const cleanLower = clean.toLowerCase();
    const rawLower = rawSource.toLowerCase();

    // Sort rules longest-raw_name first so more specific patterns take priority
    // (prevents a broad "BILKA" contains-rule from shadowing "BILKA SØNDERBORG" exact-rule)
    const sortedRules = [...rules].sort((a, b) =>
        (b.raw_name?.length || 0) - (a.raw_name?.length || 0)
    );

    // 1. Try Exact Match (on Raw name first, then cleaned)
    let match = sortedRules.find(rule =>
        (rule.raw_name && rule.raw_name.toLowerCase() === rawLower) ||
        (rule.clean_name && rule.clean_name.toLowerCase() === cleanLower)
    );
    let confidence = match ? 1.0 : 0.0;
 
    // 2. Try Prefix/Substring Match if no exact match AND rule is fuzzy
    if (!match) {
        match = sortedRules.find(rule => {
            if (rule.match_mode === 'exact') return false;

            const ruleRawLower = (rule.raw_name || "").toLowerCase().trim();
            const ruleCleanLower = (rule.clean_name || "").toLowerCase().trim();
            
            // Primary matches
            if (ruleCleanLower && (cleanLower.startsWith(ruleCleanLower) || cleanLower.includes(ruleCleanLower))) {
                return true;
            }

            // Fallback to raw matches if clean didn't hit
            if (ruleRawLower && (rawLower.startsWith(ruleRawLower) || rawLower.includes(ruleRawLower))) {
                return true;
            }

            return false;
        });
        if (match) confidence = 0.8;
    }
 
    const cleanName = match?.clean_name || clean;
    const cleanNameLower = cleanName.toLowerCase();
 
    // Find source-level settings for the resolved clean name
    const sourcePref = sourceSettings.find(s => s.name.toLowerCase() === cleanNameLower);
 
    if (match) {
        const category = match.auto_category || "";
        const sub_category = match.auto_sub_category || null;
        const secondary_categories = match.secondary_categories || [];
        const excluded = match.auto_budget === 'Exclude';
 
        // Use source-level skip_triage (auto-complete) if available, otherwise fallback to rule
        // FORCE DISABLE: Auto-complete system-wide disable
        const isAutoComplete = false; // sourcePref ? sourcePref.is_auto_complete : match.skip_triage;
 
        // Status is only Complete if auto-complete is true AND we have both category and sub-category
        // UNLESS the transaction is excluded, in which case it can be Complete
        const status = (isAutoComplete && (excluded || (category && sub_category))) ? 'Complete' : 'Pending Triage';
 
        return {
            clean_source: cleanName,
            category: category,
            sub_category: sub_category,
            secondary_categories: secondary_categories,
            status: status as any,
            budget_month: budgetMonth,
            budget_year: budgetYear,
            confidence: confidence,
            planned: match.auto_planned ?? true,
            recurring: sourcePref?.recurring || match.auto_recurring || (confidence === 1.0 ? 'Monthly' : 'N/A'),
            excluded: excluded
        };
    }

    return {
        clean_source: cleanName,
        category: "",
        sub_category: null,
        secondary_categories: [],
        status: 'Pending Triage',
        budget_month: budgetMonth,
        budget_year: budgetYear,
        confidence: 0,
        planned: true,
        recurring: sourcePref?.recurring || 'N/A',
        excluded: false
    };
};
