
import { Transaction } from "@/components/Transactions/hooks/useTransactionTable";
import { cleanSource } from "./importBrain";

export interface SimilarTransactionMatch {
    transaction: Transaction;
    score: number;
    matchType: 'exact_name' | 'contains_name' | 'none';
}

export const findSimilarTransactions = (
    currentTransaction: Transaction,
    allTransactions: Transaction[],
    inputName: string,
    matchMode: 'exact' | 'fuzzy' = 'fuzzy'
): SimilarTransactionMatch[] => {
    if (!inputName) return [];

    const currentAmount = Math.abs(currentTransaction.amount);
    const normalizedInput = inputName.toLowerCase().trim();

    const matches = allTransactions
        .filter(t => t.id !== currentTransaction.id) // Exclude self
        .map(t => {
            let score = 0;
            let matchType: SimilarTransactionMatch['matchType'] = 'none';

            const tSource = (t.source || "").toLowerCase();
            const tClean = (t.clean_source || cleanSource(t.source) || "").toLowerCase();

            // 1. Name Matching
            if (tSource === normalizedInput || tClean === normalizedInput) {
                score = 100;
                matchType = 'exact_name';
            } else if (matchMode === 'fuzzy' && (tSource.includes(normalizedInput) || normalizedInput.includes(tSource))) {
                score = 60;
                matchType = 'contains_name';
            }

            // 2. Amount Similarity (Added only if name matched or if we want fuzzy discovery)
            if (matchType !== 'none') {
                const tAmount = Math.abs(t.amount);
                if (currentAmount > 0 && Math.abs(tAmount - currentAmount) < 0.05) {
                    score += 20;
                } else if (currentAmount > 0 && Math.abs(tAmount - currentAmount) / currentAmount < 0.1) {
                    score += 10;
                }
            }

            // Filter out low scores or non-matches in exact mode
            if (score === 0) return null;
            if (matchMode === 'exact' && matchType !== 'exact_name') return null;

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
