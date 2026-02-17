import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Transaction } from '@/components/Transactions/hooks/useTransactionTable';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';

interface ReconciliationPivotProps {
    transactions: Transaction[];
}

export const ReconciliationPivot = ({ transactions }: ReconciliationPivotProps) => {
    const { settings } = useSettings();

    // Filter for Pending Reconciliation items (matching Reconciliation.tsx logic)
    const pendingItems = useMemo(() => {
        return transactions.filter(t => {
            const status = t.status || '';
            const isPending = status === 'Pending Reconciliation' ||
                status.startsWith('Pending: ') ||
                (status.startsWith('Pending ') && !['Pending Triage', 'Pending Categorisation', 'Pending Mapping', 'Pending Validation'].includes(status)) ||
                !!t.entity;
            return isPending && !t.excluded && status !== 'Reconciled';
        });
    }, [transactions]);

    const groupedItems = useMemo<Record<string, Transaction[]>>(() => {
        return pendingItems.reduce((acc, item) => {
            let group = 'Unassigned';
            if (item.entity) {
                group = item.entity;
            } else if (item.status && item.status.startsWith('Pending: ')) {
                group = item.status.replace('Pending: ', '');
            } else if (item.status && item.status.startsWith('Pending ') &&
                !['Pending Triage', 'Pending Categorisation', 'Pending Mapping', 'Pending Validation', 'Pending Reconciliation'].includes(item.status)) {
                group = item.status.replace('Pending ', '');
            }

            if (!acc[group]) acc[group] = [];
            acc[group].push(item);
            return acc;
        }, {} as Record<string, Transaction[]>);
    }, [pendingItems]);

    const summaryStats = useMemo(() => {
        return Object.entries(groupedItems).map(([group, items]) => ({
            group,
            count: items.length,
            total: items.reduce((sum, item) => sum + item.amount, 0)
        })).sort((a, b) => b.total - a.total); // Sort by highest amount owed/due
    }, [groupedItems]);

    const totalPendingBalance = pendingItems.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-[#1a1c2e] tracking-tight">Reconciliation Pivot</h2>
                    <p className="text-slate-500 text-sm font-medium">Track items pending valid classification or reimbursement.</p>
                </div>
                <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net Outstanding</span>
                    <span className={`text-xl font-black ${totalPendingBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(totalPendingBalance, settings.currency)}
                    </span>
                </div>
            </div>

            {/* Pivot Summary Table */}
            {summaryStats.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 pl-2">Summary by Person/Event</h3>
                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden ring-1 ring-slate-100">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-slate-50">
                                        <TableHead className="w-[300px] h-10 px-6 text-[11px] font-medium text-slate-400">Entity</TableHead>
                                        <TableHead className="text-center h-10 text-[11px] font-medium text-slate-400">Items</TableHead>
                                        <TableHead className="text-right h-10 px-6 text-[11px] font-medium text-slate-400">Total Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summaryStats.map((stat) => (
                                        <TableRow key={stat.group} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0 h-14">
                                            <TableCell className="px-6 font-bold text-slate-800">{stat.group}</TableCell>
                                            <TableCell className="text-center font-medium text-slate-500">{stat.count}</TableCell>
                                            <TableCell className={`px-6 text-right font-bold ${stat.total >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {formatCurrency(stat.total, settings.currency)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
