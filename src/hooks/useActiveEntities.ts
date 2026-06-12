import { useMemo } from 'react';
import { useAllTransactions } from '@/components/Transactions/hooks/useTransactionTable';

/**
 * Active entities = entities with at least one Pending Reconciliation
 * transaction. Entity dropdowns only show active entities to keep the
 * list short during recon work; full entity management lives in Settings.
 *
 * Derived from useAllTransactions rather than a direct Supabase query so it
 * works in demo mode (local data bypass) and stays consistent with the
 * optimistic cache updates from transaction mutations.
 */
export const useActiveEntities = () => {
    const { data: transactions = [], isLoading } = useAllTransactions();

    const entities = useMemo(() => {
        const unique = new Set<string>();
        transactions.forEach(t => {
            if (t.entity && t.status === 'Pending Reconciliation') unique.add(t.entity);
        });
        return Array.from(unique).sort();
    }, [transactions]);

    return { entities, isLoading };
};
