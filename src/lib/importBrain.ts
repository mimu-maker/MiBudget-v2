import { Tables } from "@/integrations/supabase/types";

export type MerchantRule = Tables<"merchant_rules">;

export const cleanDescription = (description: string): string => {
    if (!description) return "";
    // Remove everything after and including the first asterisk
    const cleaned = description.split('*')[0].trim();
    // We could add more logic here (e.g., removing common prefixes/suffixes)
    return cleaned;
};

export interface ProcessedTransaction {
    clean_description: string;
    category: string;
    sub_category: string | null;
    status: 'New' | 'Unmatched' | 'Verified' | 'Complete';
    budget_month: string; // ISO Date string (YYYY-MM-DD)
}

export const processTransaction = (
    rawDescription: string,
    rawDate: string,
    rules: MerchantRule[]
): ProcessedTransaction => {
    const clean = cleanDescription(rawDescription);

    // Default budget month to the 1st of the transaction month
    const dateObj = new Date(rawDate);
    const budgetMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)
        .toISOString()
        .split('T')[0];

    const match = rules.find(rule =>
        rule.clean_merchant_name.toLowerCase() === clean.toLowerCase()
    );

    if (match) {
        return {
            clean_description: clean,
            category: match.auto_category || "",
            sub_category: match.auto_sub_category || null,
            status: 'Verified',
            budget_month: budgetMonth
        };
    }

    return {
        clean_description: clean,
        category: "",
        sub_category: null,
        status: 'Unmatched',
        budget_month: budgetMonth
    };
};
