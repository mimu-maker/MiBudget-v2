import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Pencil, Save, RefreshCw, Search, Split, Store } from 'lucide-react';
import { Transaction } from './hooks/useTransactionTable';
import { formatCurrency, formatDate } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { useProfile } from '@/contexts/ProfileContext';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { SmartSelector } from '@/components/ui/smart-selector';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface TransactionDetailDialogProps {
    transaction: Transaction | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: (updates: Partial<Transaction>) => Promise<void>;
    initialEditMode?: boolean;
    onSplit?: (id: string) => void;
}

import { TransactionSplitModal } from './TransactionSplitModal';

export const TransactionDetailDialog = ({ transaction, open, onOpenChange, onSave, onSplit }: TransactionDetailDialogProps) => {
    const { settings } = useSettings();
    const { userProfile } = useProfile();
    const { subCategories } = useCategorySource();
    const [isSaving, setIsSaving] = useState(false);
    const [editedTx, setEditedTx] = useState<Partial<Transaction>>({});
    const [isMappingExpanded, setIsMappingExpanded] = useState(false);
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

    useEffect(() => {
        if (transaction && open) {
            setEditedTx({ ...transaction });
            setIsMappingExpanded(false);
        }
    }, [transaction, open]);

    if (!transaction) return null;

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
            await onSave(editedTx);
            onOpenChange(false);
        } catch (err) {
            console.error("Failed to save transaction corrections:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (field: keyof Transaction, value: any) => {
        setEditedTx(prev => ({ ...prev, [field]: value }));
    };

    const hasChanges = JSON.stringify({ ...transaction, ...editedTx }) !== JSON.stringify(transaction);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl bg-slate-50">
                <div className="p-6 bg-white border-b relative">
                    <DialogHeader>
                        <div className="flex items-start justify-between relative z-10 w-full gap-4">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                        {editedTx.clean_source || transaction.source}
                                    </h2>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsMappingExpanded(!isMappingExpanded)}
                                        className="h-7 w-7 p-0 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                                <div className="text-sm font-medium text-slate-500 font-mono">
                                    {transaction.source}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {!transaction.parent_id && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (onSplit) {
                                                onOpenChange(false);
                                                onSplit(transaction.id);
                                            } else {
                                                setIsSplitModalOpen(true);
                                            }
                                        }}
                                        className="h-9 px-3 text-xs font-bold gap-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200"
                                    >
                                        <Split className="w-3.5 h-3.5" /> Split
                                    </Button>
                                )}
                            </div>
                        </div>

                        {isMappingExpanded && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-2">Source Mapping</Label>
                                <div className="flex flex-col md:flex-row items-center gap-4">
                                    <div className="flex-1 w-full relative">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            value={transaction.source}
                                            disabled
                                            className="h-10 pl-9 bg-white font-mono text-sm border-slate-200"
                                        />
                                    </div>
                                    <div className="flex items-center justify-center shrink-0 px-2 group/maps">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] uppercase font-black text-blue-400 tracking-widest leading-none mb-1.5 hidden md:block group-hover/maps:text-blue-500">Maps To</span>
                                            <div className="hidden md:flex items-center relative h-1 w-12">
                                                <div className="h-[2px] w-full bg-blue-500/60 rounded-full relative">
                                                    <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t-2 border-r-2 border-blue-500 rotate-45 rounded-tr-[1px]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full relative">
                                        <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            value={editedTx.clean_source || ''}
                                            onChange={(e) => updateField('clean_source', e.target.value)}
                                            placeholder="Mapped Name"
                                            className="h-10 pl-9 bg-white font-bold text-sm border-slate-200 focus-visible:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Date and Amount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Date</Label>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-700">{formatDate(transaction.date, userProfile?.show_time, userProfile?.date_format)}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1 text-right block">Amount</Label>
                            <div className={cn(
                                "flex items-center justify-end p-3 rounded-xl border shadow-sm font-black text-lg",
                                transaction.amount >= 0
                                    ? "bg-emerald-50/50 border-emerald-100 text-emerald-600"
                                    : "bg-rose-50/50 border-rose-100 text-rose-600"
                            )}>
                                {formatCurrency(transaction.amount, settings.currency)}
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-2 relative">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Categorization</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                            <div className="space-y-1.5 flex flex-col">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</Label>
                                <CategorySelector
                                    value={editedTx.category || ''}
                                    onValueChange={(v) => {
                                        if (v.includes(':')) {
                                            const [cat, sub] = v.split(':');
                                            setEditedTx(prev => ({ ...prev, category: cat, sub_category: sub }));
                                        } else {
                                            setEditedTx(prev => ({ ...prev, category: v, sub_category: '' }));
                                        }
                                    }}
                                    hideSuggestions={true}
                                    className="h-10 shadow-sm border-slate-200 rounded-xl bg-slate-50 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5 flex flex-col">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Sub-category</Label>
                                <Select
                                    value={editedTx.sub_category || 'none'}
                                    onValueChange={(v) => updateField('sub_category', v === 'none' ? null : v)}
                                    disabled={!editedTx.category || editedTx.category === 'Uncategorized'}
                                >
                                    <SelectTrigger className="h-10 bg-slate-50 border-slate-200 flex-1 shadow-sm text-sm rounded-xl font-medium w-full text-slate-700">
                                        <SelectValue placeholder="Always Ask" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="none" className="text-slate-400 italic font-medium">Always Ask</SelectItem>
                                        {(subCategories[editedTx.category || ''] || []).map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Exclude & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-[10px] font-black text-rose-600 tracking-widest uppercase">Exclude Transaction</Label>
                                <p className="text-[10px] text-slate-400">Ignore in reports</p>
                            </div>
                            <Switch
                                checked={!!editedTx.excluded}
                                onCheckedChange={(v) => updateField('excluded', v)}
                                className="data-[state=checked]:bg-rose-500"
                            />
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-2">
                            <Label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Processing Status</Label>
                            <Select
                                value={editedTx.status || 'Pending Triage'}
                                onValueChange={(v) => updateField('status', v)}
                            >
                                <SelectTrigger className="h-9 bg-slate-50 border-slate-200 shadow-sm text-[11px] font-black rounded-lg uppercase w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg">
                                    <SelectItem value="Pending Triage">Pending Triage</SelectItem>
                                    <SelectItem value="Complete">Complete</SelectItem>
                                    <SelectItem value="Reconciled">Reconciled</SelectItem>
                                    <SelectItem value="Pending Reconciliation">Pending Reconciliation</SelectItem>
                                    <SelectItem value="Review Needed">Review Needed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Note</Label>
                        <Textarea
                            value={editedTx.notes || ''}
                            onChange={(e) => updateField('notes', e.target.value)}
                            placeholder="Add internal notes for this transaction..."
                            className="min-h-[100px] text-sm font-medium bg-white border-slate-200/60 shadow-sm rounded-xl resize-none focus:ring-blue-500 p-4"
                        />
                    </div>
                </div>

                <DialogFooter className="p-6 bg-white border-t flex items-center justify-between gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="font-black uppercase text-xs text-slate-400 hover:text-slate-800 h-11 px-6 rounded-xl hover:bg-slate-50"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs px-10 h-11 rounded-xl shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
                    >
                        {isSaving ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save / Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
            {isSplitModalOpen && (
                <TransactionSplitModal
                    open={isSplitModalOpen}
                    onOpenChange={(open) => {
                        setIsSplitModalOpen(open);
                        if (!open) {
                            // When fully closed from inside, optionally close this parent modal too
                        }
                    }}
                    transaction={transaction}
                    onSplitComplete={() => {
                        // The modal itself invalidates React Query now
                        onOpenChange(false);
                    }}
                />
            )}
        </Dialog>
    );
};
