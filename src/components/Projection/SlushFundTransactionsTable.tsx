import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, ChevronDown, ChevronRight, Edit3, Save, X, Lightbulb, Trash2 } from 'lucide-react';
import { FutureTransaction } from '@/types/projection';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface SlushFundTransactionsTableProps {
    transactions: FutureTransaction[];
    onDelete: (id: string | number) => void;
    onUpdate: (id: string | number, updates: any) => void;
    onEdit: (transaction: FutureTransaction) => void;
    onAddClick: () => void;
    selectedYear: string;
    showPastProjections: boolean;
    baselineTransactions?: FutureTransaction[];
    onAddBaselineItem?: (item: FutureTransaction) => void;
    onAddAllBaselineItems?: (items: FutureTransaction[]) => void;
}

const SlushFundTransactionsTable = ({
    transactions,
    onDelete,
    onUpdate,
    onEdit,
    onAddClick,
    selectedYear,
    showPastProjections,
    baselineTransactions = [],
    onAddBaselineItem,
    onAddAllBaselineItems
}: SlushFundTransactionsTableProps) => {
    const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
    const [editingOccurrence, setEditingOccurrence] = useState<{ id: string | number, monthKey: string, amount: string } | null>(null);

    const todayStr = format(new Date(), 'yyyy-MM-dd');

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
        const numAmount = -Math.abs(parseFloat(amount));

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

    const missingBaselineItems = baselineTransactions.filter(bt => {
        // Is this baseline item already in our current set?
        const isPresent = transactions.some(t =>
            t.source === bt.source &&
            t.date === bt.date &&
            t.amount === bt.amount &&
            t.recurring === bt.recurring
        );
        if (isPresent) return false;

        if (showPastProjections) return true;
        if (bt.recurring === 'N/A') {
            return bt.date >= todayStr;
        }
        return true;
    });

    return (
        <div className="overflow-x-auto -mx-6 -mb-6 mt-4">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-purple-100 bg-purple-50/20">
                        <th className="text-left py-2 px-6 font-black text-purple-400 text-[10px] uppercase tracking-[0.2em]">Date</th>
                        <th className="text-left py-2 px-4 font-black text-purple-400 text-[10px] uppercase tracking-[0.2em]">Stream</th>
                        <th className="text-right py-2 px-4 font-black text-purple-400 text-[10px] uppercase tracking-[0.2em]">Projected</th>
                        <th className="text-right py-2 px-4 font-black text-purple-400 text-[10px] uppercase tracking-[0.2em]">Actual</th>
                        <th className="text-right py-2 px-4 font-black text-purple-400 text-[10px] uppercase tracking-[0.2em]">Deviation</th>
                        <th className="text-center py-2 px-4 font-black text-purple-400 text-[10px] uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-purple-50/50">
                    {filteredTransactions.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-16">
                                <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                                    <div className="p-4 bg-purple-100/50 rounded-2xl text-purple-500 mb-2 ring-1 ring-purple-200/50 shadow-sm">
                                        <Lightbulb className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-purple-900 font-black text-lg tracking-tight">Plan one-offs</h3>
                                    <p className="text-purple-600/80 text-sm font-medium leading-relaxed mb-4">
                                        For irregular expenses like holidays, new phones, or car repairs.
                                    </p>
                                    <Button
                                        onClick={onAddClick}
                                        className="mt-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 h-10 px-6 font-bold"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Item
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        Object.entries(
                            filteredTransactions.reduce((groups, tx) => {
                                const stream = tx.stream || tx.category || 'Other';
                                if (!groups[stream]) groups[stream] = [];
                                groups[stream].push(tx);
                                return groups;
                            }, {} as Record<string, FutureTransaction[]>)
                        ).map(([stream, streamTxs]) => (
                            <React.Fragment key={stream}>
                                <tr className="bg-purple-50/30">
                                    <td colSpan={6} className="py-2 px-6 text-[10px] font-black uppercase tracking-widest text-purple-500 border-b border-purple-100">
                                        Category: {stream}
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

                                        const actual = Math.abs(transaction.actual_amount || 0);
                                        const deviation = actual - Math.abs(transaction.amount);

                                        return (
                                            <React.Fragment key={transaction.id}>
                                                <tr className="border-b border-purple-50 hover:bg-purple-50/50 group transition-colors">
                                                    <td className="py-3 px-6 text-sm font-semibold flex items-center gap-2">
                                                        {isRecurring && (
                                                            <button onClick={() => toggleExpand(transaction.id)} className="p-1 hover:bg-purple-100 rounded text-purple-600 transition-colors">
                                                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                            </button>
                                                        )}
                                                        <span className="text-purple-900">{dateDisplay}</span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium flex items-center gap-2">
                                                            <span className="text-purple-900">{transaction.source || transaction.stream || 'Unknown'}</span>
                                                            {transaction.is_matched && (
                                                                <Sparkles className="w-3 h-3 text-amber-500" />
                                                            )}
                                                            {isRecurring && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">{transaction.recurring}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-purple-900">
                                                        DKK {Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                                                        {actual !== 0 ? `DKK ${actual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                    </td>
                                                    <td className={`py-3 px-4 text-right font-bold ${deviation > 0 ? 'text-emerald-600' : deviation < 0 ? 'text-rose-600' : 'text-purple-300'
                                                        }`}>
                                                        {actual !== 0 ? `${deviation >= 0 ? '' : '-'}DKK ${Math.abs(deviation).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onEdit(transaction)}
                                                                className="text-purple-600 hover:bg-purple-50 transition-colors h-8 px-2 rounded-lg flex items-center gap-1"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onDelete(transaction.id)}
                                                                className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors h-8 px-2 rounded-lg flex items-center gap-1"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && occurrences.map(occ => {
                                                    const override = transaction.overrides?.[occ.monthKey];
                                                    const isEditing = editingOccurrence?.id === transaction.id && editingOccurrence?.monthKey === occ.monthKey;

                                                    return (
                                                        <tr key={`${transaction.id}-${occ.monthKey}`} className="bg-purple-50/20 border-b border-purple-50/50 italic text-xs">
                                                            <td className="py-2 px-10 text-purple-400">{occ.date}</td>
                                                            <td className="py-2 px-4 text-purple-400 flex items-center gap-2">
                                                                Occurrence
                                                                {override && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-bold uppercase">Amended</span>}
                                                            </td>
                                                            <td className="py-2 px-4 text-right">
                                                                {isEditing ? (
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <Input
                                                                            className="h-7 w-24 text-[10px] py-0 border-purple-200 focus-visible:ring-purple-500"
                                                                            value={editingOccurrence.amount}
                                                                            onChange={(e) => setEditingOccurrence({ ...editingOccurrence, amount: e.target.value })}
                                                                            autoFocus
                                                                        />
                                                                        <button onClick={() => handleSaveOverride(transaction.id, occ.monthKey, editingOccurrence.amount)} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"><Save className="w-3.5 h-3.5" /></button>
                                                                        <button onClick={() => setEditingOccurrence(null)} className="text-purple-300 p-1 hover:bg-purple-50 rounded"><X className="w-3.5 h-3.5" /></button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-end gap-2 group/row">
                                                                        <span className="font-semibold text-purple-700">DKK {Math.abs(override?.amount ?? transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                        <button
                                                                            onClick={() => setEditingOccurrence({ id: transaction.id, monthKey: occ.monthKey, amount: Math.abs(override?.amount ?? transaction.amount).toString() })}
                                                                            className="opacity-0 group-hover/row:opacity-100 text-purple-500 p-1 hover:bg-purple-100 rounded transition-all"
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

            {missingBaselineItems.length > 0 && (
                <div className="mt-8 border-t border-purple-100 bg-purple-50/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-purple-900 font-black text-sm tracking-tight capitalize">Missing from Baseline</h3>
                                <p className="text-purple-500/80 text-[10px] font-medium leading-relaxed">
                                    These items exist in the Baseline projection but are missing in this scenario.
                                </p>
                            </div>
                        </div>
                        {onAddAllBaselineItems && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAddAllBaselineItems(missingBaselineItems)}
                                className="h-8 border-purple-200 font-bold text-purple-700 hover:bg-purple-50 gap-1.5 rounded-lg shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add All Baseline Items
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {missingBaselineItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-purple-100 shadow-sm hover:border-purple-200 transition-colors group">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-purple-900">{item.source || item.stream || 'Unknown'}</span>
                                        {item.recurring !== 'N/A' && (
                                            <span className="text-[8px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-black uppercase">{item.recurring}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-medium text-purple-400">
                                        <span className="font-mono">{new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        <span className="font-bold text-slate-400">DKK {Math.abs(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onAddBaselineItem?.(item)}
                                    className="h-7 w-7 p-0 rounded-lg text-purple-400 hover:text-purple-600 hover:bg-purple-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SlushFundTransactionsTable;
