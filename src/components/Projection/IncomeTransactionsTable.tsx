import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, ChevronDown, ChevronRight, Edit3, Save, X } from 'lucide-react';
import { FutureTransaction } from '@/types/projection';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface IncomeTransactionsTableProps {
    transactions: FutureTransaction[];
    onDelete: (id: string | number) => void;
    onUpdate: (id: string | number, updates: any) => void;
    onAddClick: () => void;
    selectedYear: string;
    showPastProjections: boolean;
}

const IncomeTransactionsTable = ({
    transactions,
    onDelete,
    onUpdate,
    onAddClick,
    selectedYear,
    showPastProjections
}: IncomeTransactionsTableProps) => {
    const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
    const [editingOccurrence, setEditingOccurrence] = useState<{ id: string | number, monthKey: string, amount: string } | null>(null);

    const todayStr = new Date().toISOString().slice(0, 10);

    const toggleExpand = (id: string | number) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const getOccurrences = (t: FutureTransaction, year: number) => {
        const occurrences: { date: string, monthKey: string }[] = [];
        const start = new Date(t.date);

        if (t.recurring === 'Monthly') {
            for (let i = 0; i < 12; i++) {
                const d = new Date(year, i, start.getDate());
                if (d >= start) {
                    occurrences.push({ date: d.toISOString().slice(0, 10), monthKey: d.toISOString().slice(0, 7) });
                }
            }
        } else if (t.recurring === 'Quarterly') {
            for (let i = 0; i < 12; i++) {
                if ((i - start.getMonth()) % 3 === 0) {
                    const d = new Date(year, i, start.getDate());
                    if (d >= start) {
                        occurrences.push({ date: d.toISOString().slice(0, 10), monthKey: d.toISOString().slice(0, 7) });
                    }
                }
            }
        } else if (t.recurring === 'Annually') {
            const d = new Date(year, start.getMonth(), start.getDate());
            if (d >= start) {
                occurrences.push({ date: d.toISOString().slice(0, 10), monthKey: d.toISOString().slice(0, 7) });
            }
        } else if (t.recurring === 'Bi-annually') {
            for (let i = 0; i < 12; i++) {
                if ((i - start.getMonth()) % 6 === 0) {
                    const d = new Date(year, i, start.getDate());
                    if (d >= start) {
                        occurrences.push({ date: d.toISOString().slice(0, 10), monthKey: d.toISOString().slice(0, 7) });
                    }
                }
            }
        }
        return occurrences;
    };

    const handleSaveOverride = (id: string | number, monthKey: string, amount: string) => {
        const t = transactions.find(tx => tx.id === id);
        if (!t) return;

        const newOverrides = { ...(t.overrides || {}) };
        const numAmount = parseFloat(amount);

        if (isNaN(numAmount)) return;

        newOverrides[monthKey] = { amount: numAmount };
        onUpdate(id, { overrides: newOverrides });
        setEditingOccurrence(null);
    };
    // Filter out past projections if not requested
    const filteredTransactions = transactions.filter(t => {
        if (showPastProjections) return true;
        if (t.recurring === 'N/A') {
            return t.date >= todayStr;
        }
        return true;
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Projected Income</CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onAddClick}
                            className="h-8 w-8 p-0"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-400 bg-gray-200">
                                <th className="text-left py-3 px-4 font-bold text-gray-900">Date</th>
                                <th className="text-left py-3 px-4 font-bold text-gray-900">Stream</th>
                                <th className="text-right py-3 px-4 font-bold text-gray-900">Projected</th>
                                <th className="text-right py-3 px-4 font-bold text-gray-900">Actual</th>
                                <th className="text-right py-3 px-4 font-bold text-gray-900">Deviation</th>
                                <th className="text-center py-3 px-4 font-bold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500">
                                        No income transactions planned. Click + to add one.
                                    </td>
                                </tr>
                            ) : (
                                Object.entries(
                                    filteredTransactions.reduce((groups, tx) => {
                                        const stream = tx.stream || 'Other';
                                        if (!groups[stream]) groups[stream] = [];
                                        groups[stream].push(tx);
                                        return groups;
                                    }, {} as Record<string, FutureTransaction[]>)
                                ).map(([stream, streamTxs]) => (
                                    <React.Fragment key={stream}>
                                        <tr className="bg-gray-50/50">
                                            <td colSpan={6} className="py-2 px-4 text-xs font-black uppercase tracking-wider text-gray-500 border-b border-gray-200">
                                                Stream: {stream}
                                            </td>
                                        </tr>
                                        {streamTxs
                                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                            .map((transaction) => {
                                                const date = new Date(transaction.date);
                                                const dateDisplay = date.toLocaleDateString('en-GB', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                });

                                                const isRecurring = transaction.recurring !== 'N/A';
                                                const isExpanded = expandedIds.has(transaction.id);
                                                let occurrences = isRecurring ? getOccurrences(transaction, parseInt(selectedYear)) : [];

                                                if (!showPastProjections) {
                                                    occurrences = occurrences.filter(occ => occ.date >= todayStr);
                                                }

                                                const actual = transaction.actual_amount || 0;
                                                const deviation = actual - transaction.amount;

                                                return (
                                                    <React.Fragment key={transaction.id}>
                                                        <tr className="border-b border-gray-200 hover:bg-gray-50 group">
                                                            <td className="py-3 px-4 text-sm font-semibold flex items-center gap-1">
                                                                {isRecurring && (
                                                                    <button onClick={() => toggleExpand(transaction.id)} className="p-1 hover:bg-gray-200 rounded">
                                                                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                                    </button>
                                                                )}
                                                                {dateDisplay}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="font-medium flex items-center gap-2">
                                                                    {transaction.source || transaction.stream || 'Unknown'}
                                                                    {transaction.is_matched && (
                                                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                                                    )}
                                                                    {isRecurring && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded font-bold uppercase">{transaction.recurring}</span>}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-semibold">
                                                                DKK {transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-semibold text-green-600">
                                                                {actual !== 0 ? `DKK ${actual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                            </td>
                                                            <td className={`py-3 px-4 text-right font-semibold ${deviation > 0 ? 'text-green-600' : deviation < 0 ? 'text-red-600' : ''
                                                                }`}>
                                                                {actual !== 0 ? `${deviation >= 0 ? '' : '-'}DKK ${Math.abs(deviation).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => onDelete(transaction.id)}
                                                                    className="text-red-600 hover:bg-red-50 text-xs"
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && occurrences.map(occ => {
                                                            const override = transaction.overrides?.[occ.monthKey];
                                                            const isEditing = editingOccurrence?.id === transaction.id && editingOccurrence?.monthKey === occ.monthKey;

                                                            return (
                                                                <tr key={`${transaction.id}-${occ.monthKey}`} className="bg-gray-50/30 border-b border-gray-100 italic text-xs">
                                                                    <td className="py-2 px-8 text-gray-500">{occ.date}</td>
                                                                    <td className="py-2 px-4 text-gray-500 flex items-center gap-2">
                                                                        Occurrence
                                                                        {override && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded font-bold">AMENDED</span>}
                                                                    </td>
                                                                    <td className="py-2 px-4 text-right">
                                                                        {isEditing ? (
                                                                            <div className="flex items-center justify-end gap-1">
                                                                                <Input
                                                                                    className="h-6 w-24 text-xs py-0"
                                                                                    value={editingOccurrence.amount}
                                                                                    onChange={(e) => setEditingOccurrence({ ...editingOccurrence, amount: e.target.value })}
                                                                                    autoFocus
                                                                                />
                                                                                <button onClick={() => handleSaveOverride(transaction.id, occ.monthKey, editingOccurrence.amount)} className="text-green-600"><Save className="w-3 h-3" /></button>
                                                                                <button onClick={() => setEditingOccurrence(null)} className="text-gray-400"><X className="w-3 h-3" /></button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center justify-end gap-2 group/row">
                                                                                <span>DKK {(override?.amount ?? transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                                <button
                                                                                    onClick={() => setEditingOccurrence({ id: transaction.id, monthKey: occ.monthKey, amount: (override?.amount ?? transaction.amount).toString() })}
                                                                                    className="opacity-0 group-hover/row:opacity-100 text-primary p-0.5 hover:bg-primary/10 rounded"
                                                                                >
                                                                                    <Edit3 className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td colSpan={3}></td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default IncomeTransactionsTable;
