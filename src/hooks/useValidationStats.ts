import { useMemo } from 'react';
import { useAllTransactions } from '@/components/Transactions/hooks/useTransactionTable';

export const useValidationStats = () => {
    const { data: transactions = [] } = useAllTransactions();

    // Buckets calculation - logic copied from ValidationDashboard.tsx
    const duplicateGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        transactions.forEach(tx => {
            const key = `${tx.date}_${tx.amount}_${(tx.source || '').toLowerCase()}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(tx);
        });
        return Object.values(groups)
            .filter(g => g.length > 1);
    }, [transactions]);

    const duplicateIds = useMemo(() => {
        const ids = new Set<string>();
        duplicateGroups.forEach(group => {
            group.forEach(tx => ids.add(tx.id));
        });
        return ids;
    }, [duplicateGroups]);

    const pendingSourceMapping = useMemo(() =>
        transactions.filter(tx => (!tx.confidence || tx.confidence <= 0) && tx.status !== 'Complete' && tx.status !== 'Excluded' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    const pendingCategorisation = useMemo(() =>
        transactions.filter(tx => tx.confidence > 0 && (!tx.category || !tx.sub_category) && tx.status !== 'Complete' && tx.status !== 'Excluded' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    const pendingValidation = useMemo(() =>
        transactions.filter(tx => tx.confidence > 0 && tx.category && tx.sub_category && tx.status !== 'Complete' && tx.status !== 'Excluded' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    // We are not using pendingValidation for the badges as per user request (only Mapping, Category, Duplicate)
    // User requested: Pending Mapping, Pending Category, Duplicate

    // Reconciliation Logic
    // Filter for Pending Reconciliation items
    const pendingReconciliationItems = useMemo(() => {
        return transactions.filter(t => {
            const status = t.status || '';
            const isPending = status === 'Pending Reconciliation' ||
                status.startsWith('Pending: ') ||
                (status.startsWith('Pending ') && !['Pending Triage', 'Pending Categorisation', 'Pending Mapping', 'Pending Validation'].includes(status)) ||
                !!t.entity;
            return isPending && !t.excluded && status !== 'Reconciled';
        });
    }, [transactions]);

    const reconciliationTotal = useMemo(() => {
        return pendingReconciliationItems.reduce((sum, item) => sum + item.amount, 0);
    }, [pendingReconciliationItems]);

    return {
        pendingMappingCount: pendingSourceMapping.length,
        pendingCategoryCount: pendingCategorisation.length,
        duplicateCount: duplicateGroups.length,
        duplicateGroupCount: duplicateGroups.length,

        // Reconciliation
        reconciliationCount: pendingReconciliationItems.length,
        reconciliationTotal,

        // Also returning raw data if needed
        hasPendingActions: pendingSourceMapping.length > 0 || pendingCategorisation.length > 0 || duplicateGroups.length > 0
    };
};
