import { useMemo, useState } from 'react';
import { Transaction } from '@/components/Transactions/hooks/useTransactionTable';

export interface ReconCombination {
    /** ids of the negative transactions in this combination */
    ids: string[];
    /** sum of the negative amounts (a negative number) */
    total: number;
    /** positive.amount + total — 0 means a perfect offset */
    difference: number;
    exact: boolean;
}

const EXACT_TOLERANCE = 1; // ±1 kr for rounding
const APPROX_PCT = 0.05;   // fall back to combos within ±5% of the positive
const MAX_RESULTS = 8;
const MAX_ITEMS = 18;      // 2^18 masks ≈ 262k — groups are typically <15 items

/**
 * Exhaustive subset-sum over the negative rows of a group: find all
 * combinations whose sum offsets the given positive amount.
 * Exact matches (±1 kr) win; if none exist, near misses within ±5% are
 * returned flagged as approximate.
 */
export const findMatchingCombinations = (
    positiveAmount: number,
    negatives: Transaction[]
): ReconCombination[] => {
    const pool = negatives.slice(0, MAX_ITEMS);
    const n = pool.length;
    if (n === 0 || positiveAmount <= 0) return [];

    const exact: ReconCombination[] = [];
    const approx: ReconCombination[] = [];
    const approxLimit = Math.abs(positiveAmount) * APPROX_PCT;

    for (let mask = 1; mask < (1 << n); mask++) {
        let total = 0;
        const ids: string[] = [];
        for (let i = 0; i < n; i++) {
            if (mask & (1 << i)) {
                total += pool[i].amount;
                ids.push(pool[i].id);
            }
        }
        const difference = positiveAmount + total;
        if (Math.abs(difference) <= EXACT_TOLERANCE) {
            exact.push({ ids, total, difference, exact: true });
        } else if (Math.abs(difference) <= approxLimit) {
            approx.push({ ids, total, difference, exact: false });
        }
    }

    const byQuality = (a: ReconCombination, b: ReconCombination) =>
        Math.abs(a.difference) - Math.abs(b.difference) || a.ids.length - b.ids.length;

    return (exact.length > 0 ? exact : approx).sort(byQuality).slice(0, MAX_RESULTS);
};

/**
 * Selection state machine for the reconciliation matcher.
 * One positive row can be selected at a time; combinations are computed
 * against the negative rows of the same entity group.
 */
export const useReconMatcher = (groups: Record<string, Transaction[]>) => {
    const [selectedPositiveId, setSelectedPositiveId] = useState<string | null>(null);
    const [hoveredIds, setHoveredIds] = useState<string[] | null>(null);
    const [chosenIds, setChosenIds] = useState<string[] | null>(null);

    const selection = useMemo(() => {
        if (!selectedPositiveId) return null;
        for (const [entity, items] of Object.entries(groups)) {
            const positive = items.find(i => i.id === selectedPositiveId);
            if (positive) return { entity, positive, items };
        }
        return null; // positive left the group (e.g. just reconciled)
    }, [selectedPositiveId, groups]);

    const combinations = useMemo(() => {
        if (!selection) return [];
        return findMatchingCombinations(
            selection.positive.amount,
            selection.items.filter(i => i.amount < 0)
        );
    }, [selection]);

    const togglePositive = (tx: Transaction) => {
        setHoveredIds(null);
        setChosenIds(null);
        setSelectedPositiveId(prev => (prev === tx.id ? null : tx.id));
    };

    const reset = () => {
        setSelectedPositiveId(null);
        setHoveredIds(null);
        setChosenIds(null);
    };

    const highlightedIds = useMemo(
        () => new Set<string>([...(hoveredIds || []), ...(chosenIds || [])]),
        [hoveredIds, chosenIds]
    );

    return {
        selection,
        combinations,
        selectedPositiveId,
        chosenIds,
        highlightedIds,
        togglePositive,
        setHoveredIds,
        setChosenIds,
        reset
    };
};
