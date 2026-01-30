
import { Transaction } from "@/components/Transactions/hooks/useTransactionTable";
import { cleanMerchant } from "./importBrain";

export interface SimilarTransactionMatch {
    transaction: Transaction;
    score: number;
    matchType: 'exact_name' | 'contains_name' | 'amount_similarity' | 'none';
}

export const findSimilarTransactions = (
    currentTransaction: Transaction,
    allTransactions: Transaction[],
    inputName: string
): SimilarTransactionMatch[] => {
    if (!inputName) return [];

    const currentAmount = Math.abs(currentTransaction.amount);
    const normalizedInput = inputName.toLowerCase().trim();

    const matches = allTransactions
        .filter(t => t.id !== currentTransaction.id) // Exclude self
        .map(t => {
            let score = 0;
            let matchType: SimilarTransactionMatch['matchType'] = 'none';

            const tMerchant = (t.merchant || "").toLowerCase();
            const tClean = (t.clean_merchant || cleanMerchant(t.merchant) || "").toLowerCase();

            // 1. Name Matching (Highest Priority)
            if (tMerchant === normalizedInput || tClean === normalizedInput) {
                score += 100;
                matchType = 'exact_name';
            } else if (tMerchant.includes(normalizedInput) || normalizedInput.includes(tMerchant)) {
                score += 50; // Reduced from 60 to be stricter (User feedback: contains -> equals)
                matchType = 'contains_name';
            }

            // 2. Amount Similarity (Secondary)
            // If matchType is 'none', we handle amount only matches with lower score
            const tAmount = Math.abs(t.amount);
            if (currentAmount > 0 && Math.abs(tAmount - currentAmount) < 0.05) { // Exact amount/Very close
                score += 20;
                if (matchType === 'none') matchType = 'amount_similarity';
            } else if (currentAmount > 0 && Math.abs(tAmount - currentAmount) / currentAmount < 0.1) { // Within 10%
                score += 10;
            }

            // Filter out low scores
            if (score <= 10) return null;

            return {
                transaction: t,
                score,
                matchType
            };
        })
        .filter((item): item is SimilarTransactionMatch => item !== null)
        .sort((a, b) => b.score - a.score);

    return matches;
};
