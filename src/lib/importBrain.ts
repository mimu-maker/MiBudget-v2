import { Tables } from "@/integrations/supabase/types";

export type MerchantRule = Tables<"merchant_rules">;

export const cleanMerchant = (merchant: string): string => {
    if (!merchant) return "";

    // 1. Remove everything after '*' or '  ' (common statement separators)
    let cleaned = merchant.split('*')[0].split('  ')[0].trim();

    // 2. Remove common noise prefixes
    cleaned = cleaned.replace(/^(PAYPAL \*|SUMUP \*|IZ \*|GOOGLE \*)/i, '');

    // 3. Remove trailing digits and reference numbers (e.g. "Amazon 12345", "Supermarket #882")
    cleaned = cleaned.replace(/[\s#]+\d+$/g, '').trim();

    // 4. Remove common noise like ".com", "Ltd", etc.
    cleaned = cleaned.replace(/\.(com|co\.uk|dk|net|org)$/i, '');

    return cleaned.trim();
};

export interface ProcessedTransaction {
    clean_merchant: string;
    category: string;
    sub_category: string | null;
    status: 'New' | 'Unmatched' | 'Verified' | 'Complete';
    budget_month: string;
    confidence: number; // 0.0 to 1.0
    planned: boolean;
    recurring: boolean;
}

export const processTransaction = (
    rawMerchant: string,
    rawDate: string,
    rules: MerchantRule[]
): ProcessedTransaction => {
    const clean = cleanMerchant(rawMerchant);
    const dateObj = new Date(rawDate);
    const isFuture = dateObj > new Date();

    // Default budget month to the 1st of the transaction month
    const budgetMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)
        .toISOString()
        .split('T')[0];

    const cleanLower = clean.toLowerCase();

    // 1. Try Exact Match
    let match = rules.find(rule =>
        rule.clean_merchant_name.toLowerCase() === cleanLower
    );
    let confidence = match ? 1.0 : 0.0;

    // 2. Try Prefix/Substring Match if no exact match (the "Amazon 123" case)
    if (!match) {
        match = rules.find(rule => {
            const ruleName = rule.clean_merchant_name.toLowerCase();
            return cleanLower.startsWith(ruleName) || ruleName.startsWith(cleanLower);
        });
        if (match) confidence = 0.8;
    }

    if (match) {
        return {
            clean_merchant: clean,
            category: match.auto_category || "",
            sub_category: match.auto_sub_category || null,
            status: match.skip_triage ? 'Complete' : (confidence === 1.0 ? 'Verified' : 'Unmatched'),
            budget_month: budgetMonth,
            confidence: confidence,
            planned: isFuture,
            recurring: confidence === 1.0 // Heuristic: exact matches are likely recurring bills
        };
    }

    return {
        clean_merchant: clean,
        category: "",
        sub_category: null,
        status: 'Unmatched',
        budget_month: budgetMonth,
        confidence: 0,
        planned: isFuture,
        recurring: false
    };
};
