import { supabase } from "@/integrations/supabase/client";
import { cleanSource } from "./importBrain";

export interface SourceScore {
    name: string;
    score: number;
    reasons: string[];
    variance: number;
    usageCount: number;
}

export const calculateSourceScores = async (
    rules: any[],
    transactions: any[]
): Promise<Record<string, SourceScore>> => {
    const scores: Record<string, SourceScore> = {};

    // 1. Group transactions by clean_source to find variance and usage
    const sourceStats: Record<string, { categories: Set<string>, count: number, amounts: number[] }> = {};

    transactions.forEach(tx => {
        const name = tx.clean_source || cleanSource(tx.source);
        if (!name) return;

        if (!sourceStats[name]) {
            sourceStats[name] = { categories: new Set(), count: 0, amounts: [] };
        }

        if (tx.category) sourceStats[name].categories.add(tx.category);
        sourceStats[name].count++;
        sourceStats[name].amounts.push(Math.abs(tx.amount));
    });

    // 2. Score each source rule
    rules.forEach(rule => {
        const name = rule.clean_source_name;
        if (!name) return;

        let score = 50; // Base score
        const reasons: string[] = [];
        const stats = sourceStats[name] || { categories: new Set(), count: 0, amounts: [] };

        // Recurring Setting Impact
        if (rule.auto_recurring === 'N/A') {
            score += 20;
            reasons.push("Prioritized (N/A Recurring)");
        } else if (rule.auto_recurring === 'One-off') {
            score -= 30;
            reasons.push("Down-ranked (One-off)");
        }

        // Variance Impact (Favor sources used across multiple categories)
        if (stats.categories.size > 1) {
            score += stats.categories.size * 5;
            reasons.push(`High Variance (+${stats.categories.size} categories)`);
        }

        // Usage Frequency
        if (stats.count > 5) {
            score += 10;
            reasons.push("Frequent Source");
        }

        scores[name] = {
            name,
            score,
            reasons,
            variance: stats.categories.size,
            usageCount: stats.count
        };
    });

    return scores;
};

export const getSignificantAmountDifference = (
    amount: number,
    historicalAmounts: number[]
): { isSignificant: boolean, diffPercent: number } => {
    if (historicalAmounts.length === 0) return { isSignificant: false, diffPercent: 0 };

    const absAmount = Math.abs(amount);
    const avg = historicalAmounts.reduce((a, b) => a + b, 0) / historicalAmounts.length;

    if (avg === 0) return { isSignificant: false, diffPercent: 0 };

    const diff = Math.abs(absAmount - avg);
    const diffPercent = diff / avg;

    return {
        isSignificant: diffPercent >= 0.05, // 5%+ difference
        diffPercent
    };
};
