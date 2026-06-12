
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { useCategorySource, useGroupedCategories } from '@/hooks/useBudgetCategories';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { Transaction } from './hooks/useTransactionTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatUtils';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/UnifiedAuthContext';

interface TransactionSplitModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction;
    onSplitComplete: () => void;
}

type SplitStatus =
    | 'Pending Triage'
    | 'Pending Categorisation'
    | 'Pending Validation'
    | 'Pending Reconciliation'
    | 'Complete'
    | 'Excluded';

const ALL_SPLIT_STATUSES: SplitStatus[] = [
    'Complete',
    'Pending Triage',
    'Pending Categorisation',
    'Pending Validation',
    'Pending Reconciliation',
    'Excluded',
];

// Statuses where auto-suggest on category change is allowed
const AUTO_SUGGEST_STATUSES: SplitStatus[] = [
    'Pending Triage',
    'Pending Categorisation',
    'Complete',
];

function suggestStatus(category: string, sub_category: string | null): SplitStatus {
    if (category && sub_category) return 'Complete';
    if (category) return 'Pending Categorisation';
    return 'Pending Triage';
}

const STATUS_ROW_STYLE: Record<SplitStatus, string> = {
    'Complete': 'bg-emerald-50/40 border-emerald-100',
    'Excluded': 'bg-rose-50/50 border-rose-100',
    'Pending Reconciliation': 'bg-amber-50/50 border-amber-100',
    'Pending Triage': 'bg-white border-transparent hover:border-slate-100',
    'Pending Categorisation': 'bg-white border-transparent hover:border-slate-100',
    'Pending Validation': 'bg-blue-50/30 border-blue-100',
};

interface SplitItem {
    id: string;
    name: string;
    amount: number;
    amountStr: string; // raw input string to avoid NaN while typing
    category: string;
    sub_category: string | null;
    status: SplitStatus;
}

function safeParseFloat(str: string): number {
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
}

export const TransactionSplitModal = ({ open, onOpenChange, transaction, onSplitComplete }: TransactionSplitModalProps) => {
    const { subCategories: displaySubCategories } = useCategorySource();
    const { income, feeders, expenses, slush, isLoading: categoriesLoading } = useGroupedCategories();
    const { currentAccountId } = useAuth();
    const queryClient = useQueryClient();
    const [items, setItems] = useState<SplitItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Reset whenever parent closes modal (covers both direct state changes and Dialog dismissal)
    useEffect(() => {
        if (!open) setItems([]);
    }, [open]);

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);
    };

    const totalAllocated = items.reduce((sum, item) => sum + item.amount, 0);
    const remaining = transaction.amount - totalAllocated;
    const isBalanced = Math.abs(remaining) < 0.01;
    // Category/sub-category only required when the row is marked Complete
    const incompleteRows = items.filter(i => i.status === 'Complete' && (!i.category || !i.sub_category));
    const canSave = isBalanced && items.length > 0 && incompleteRows.length === 0;

    const handleAddItem = () => {
        const safeRemaining = isNaN(remaining) ? 0 : remaining;
        setItems(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name: transaction.source || '',
                amount: safeRemaining,
                amountStr: String(safeRemaining),
                category: '',
                sub_category: null,
                status: 'Pending Triage',
            }
        ]);
    };

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const updateAmount = (id: string, raw: string) => {
        const parsed = safeParseFloat(raw);
        setItems(prev => prev.map(i =>
            i.id === id ? { ...i, amount: parsed, amountStr: raw } : i
        ));
    };

    const updateName = (id: string, value: string) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, name: value } : i));
    };

    const updateStatus = (id: string, value: SplitStatus) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: value } : i));
    };

    const updateCategory = (id: string, category: string, sub_category: string | null) => {
        setItems(prev => prev.map(i => {
            if (i.id !== id) return i;
            const autoSuggest = AUTO_SUGGEST_STATUSES.includes(i.status);
            const newStatus = autoSuggest ? suggestStatus(category, sub_category) : i.status;
            return { ...i, category, sub_category, status: newStatus };
        }));
    };

    const updateSubCategory = (id: string, sub_category: string) => {
        setItems(prev => prev.map(i => {
            if (i.id !== id) return i;
            const autoSuggest = AUTO_SUGGEST_STATUSES.includes(i.status);
            const newStatus = autoSuggest ? suggestStatus(i.category, sub_category) : i.status;
            return { ...i, sub_category, status: newStatus };
        }));
    };

    const handleSave = async () => {
        if (!canSave) return;
        setIsSaving(true);
        try {
            // account_id is NOT NULL in the DB — must be carried from the parent transaction
            const accountId = (transaction as any).account_id || currentAccountId;
            const { error: insertError } = await (supabase.from('transactions') as any).insert(
                items.map(item => ({
                    user_id: transaction.user_id,
                    account_id: accountId,
                    date: transaction.date,
                    merchant: item.name,
                    clean_merchant: item.name,
                    clean_source: item.name,
                    amount: item.amount,
                    account: transaction.account,
                    status: item.status,
                    excluded: item.status === 'Excluded',
                    category: item.category || null,
                    sub_category: item.sub_category || null,
                    budget_month: transaction.budget_month,
                    budget_year: transaction.budget_year,
                    parent_id: transaction.id,
                    notes: `Split item from ${transaction.source}`,
                }))
            );

            if (insertError) throw insertError;

            const { error: updateError } = await (supabase.from('transactions') as any)
                .update({
                    is_split: true,
                    status: 'Complete',
                    budget: 'Exclude',
                    category: null,
                    sub_category: null,
                })
                .eq('id', transaction.id);

            if (updateError) throw updateError;

            await queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
            await queryClient.invalidateQueries({ queryKey: ['transactions-all'] });

            handleOpenChange(false);
            onSplitComplete();
        } catch (err: any) {
            console.error('Failed to save splits:', err);
            alert(`Failed to save split transaction: ${err?.message || err}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Itemize Transaction</DialogTitle>
                    <DialogDescription>
                        Split <span className="font-bold">{transaction.source}</span> ({formatCurrency(transaction.amount, 'DKK')}) into multiple items.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 my-4">
                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wider font-bold text-slate-400 px-1">
                        <div className="col-span-3">Item Name</div>
                        <div className="col-span-2 text-right">Amount</div>
                        <div className="col-span-2">Category</div>
                        <div className="col-span-2">Sub-Category</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-1" />
                    </div>

                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`grid grid-cols-12 gap-2 items-center animate-in fade-in slide-in-from-left-2 duration-200 p-1.5 rounded-lg border ${STATUS_ROW_STYLE[item.status]}`}
                        >
                            {/* Name */}
                            <div className="col-span-3">
                                <Input
                                    value={item.name}
                                    onChange={(e) => updateName(item.id, e.target.value)}
                                    placeholder="Item name"
                                    className="h-8 text-sm"
                                />
                            </div>

                            {/* Amount */}
                            <div className="col-span-2">
                                <Input
                                    type="number"
                                    value={item.amountStr}
                                    onChange={(e) => updateAmount(item.id, e.target.value)}
                                    onBlur={(e) => {
                                        // Normalise on blur so display is clean
                                        const n = safeParseFloat(e.target.value);
                                        setItems(prev => prev.map(i =>
                                            i.id === item.id ? { ...i, amount: n, amountStr: String(n) } : i
                                        ));
                                    }}
                                    className="h-8 text-right font-mono text-sm"
                                />
                            </div>

                            {/* Category */}
                            <div className="col-span-2">
                                <CategorySelector
                                    value={item.category}
                                    onValueChange={(val) => {
                                        if (val === 'always-ask') return;
                                        if (val.includes(':')) {
                                            const [cat, sub] = val.split(':');
                                            updateCategory(item.id, cat, sub);
                                        } else {
                                            updateCategory(item.id, val, item.sub_category);
                                        }
                                    }}
                                    type="all"
                                    hideSuggestions={true}
                                    showAlwaysAsk={false}
                                    className="h-8 shadow-sm"
                                    groupedCategories={{ income, feeders, expenses, slush }}
                                    isLoadingCategories={categoriesLoading}
                                />
                            </div>

                            {/* Sub-Category */}
                            <div className="col-span-2">
                                <Select
                                    value={item.sub_category || ''}
                                    onValueChange={(val) => updateSubCategory(item.id, val)}
                                    disabled={!displaySubCategories?.[item.category]?.length}
                                >
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {displaySubCategories?.[item.category]?.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status */}
                            <div className="col-span-2">
                                <Select
                                    value={item.status}
                                    onValueChange={(val) => updateStatus(item.id, val as SplitStatus)}
                                >
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ALL_SPLIT_STATUSES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Delete */}
                            <div className="col-span-1 flex justify-end">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Remove"
                                    className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => handleRemoveItem(item.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    <Button variant="outline" size="sm" onClick={handleAddItem} className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                    </Button>
                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Original Total</span>
                            <span className="font-mono font-bold">{formatCurrency(transaction.amount, 'DKK')}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Allocated</span>
                            <span className={`font-mono font-bold ${Math.abs(totalAllocated) > Math.abs(transaction.amount) ? 'text-red-500' : 'text-emerald-600'}`}>
                                {formatCurrency(totalAllocated, 'DKK')}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Remaining</span>
                            <Badge variant={isBalanced ? 'outline' : 'destructive'} className={isBalanced ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}>
                                {formatCurrency(remaining, 'DKK')}
                            </Badge>
                        </div>
                        {incompleteRows.length > 0 && (
                            <span className="text-xs text-amber-600 font-medium max-w-[220px]">
                                Complete rows need category + sub-category
                            </span>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!canSave || isSaving} title={incompleteRows.length > 0 ? 'Rows marked Complete need a category and sub-category' : undefined}>
                            {isSaving ? 'Saving...' : 'Save Items'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
