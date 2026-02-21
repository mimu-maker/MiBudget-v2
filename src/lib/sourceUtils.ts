
import { Transaction } from "@/components/Transactions/hooks/useTransactionTable";
import { cleanSource } from "./importBrain";

export interface SimilarTransactionMatch {
    transaction: Transaction;
    score: number;
    matchType: 'direct' | 'fuzzy' | 'none';
}

export const findSimilarTransactions = (
    currentTransaction: Transaction,
    allTransactions: Transaction[],
    inputName: string,
    matchMode: 'exact' | 'fuzzy' = 'fuzzy',
    noiseFilters: string[] = []
): SimilarTransactionMatch[] => {
    if (!inputName) return [];

    const currentAmount = Math.abs(currentTransaction.amount);
    const normalizedInput = inputName.toLowerCase().trim();

    const matches = allTransactions
        .filter(t => t.id !== currentTransaction.id) // Exclude self
        .map(t => {
            let score = 0;
            let matchType: SimilarTransactionMatch['matchType'] = 'none';

            const tSource = (t.source || "").toLowerCase().trim();
            const tClean = (t.clean_source || cleanSource(t.source, noiseFilters) || "").toLowerCase().trim();

            // 1. Name Matching
            // Direct matches are identical raw sources
            if (tSource === currentTransaction.source.toLowerCase().trim()) {
                score = 100;
                matchType = 'direct';
            } else if (tSource === normalizedInput || tClean === normalizedInput) {
                score = 90;
                matchType = 'fuzzy';
            } else if (matchMode === 'fuzzy' && (tSource.includes(normalizedInput) || normalizedInput.includes(tSource))) {
                score = 60;
                matchType = 'fuzzy';
            }

            // 2. Amount Similarity (Added only if name matched)
            if (matchType !== 'none') {
                const tAmount = Math.abs(t.amount);
                if (currentAmount > 0 && Math.abs(tAmount - currentAmount) < 0.01) {
                    score += 10; // Exact amount match is strong signal
                } else if (currentAmount > 0 && Math.abs(tAmount - currentAmount) < 0.05) {
                    score += 5;
                }
            }

            // Filter out low scores or non-matches in exact mode
            if (score === 0) return null;
            if (matchMode === 'exact' && matchType !== 'direct' && tSource !== normalizedInput) return null;

            return {
                transaction: t,
                score,
                matchType
            };
        })
        .filter((item): item is SimilarTransactionMatch => item !== null)
        .sort((a, b) => {
            // Sort by match type first (direct matches top), then score
            if (a.matchType === 'direct' && b.matchType !== 'direct') return -1;
            if (a.matchType !== 'direct' && b.matchType === 'direct') return 1;
            return b.score - a.score;
        });

    return matches;
};
