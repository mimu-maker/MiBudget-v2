
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { Transaction } from './hooks/useTransactionTable'; // Adjust import path as needed
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatUtils';
import { Badge } from '@/components/ui/badge';

interface TransactionSplitModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction;
    onSplitComplete: () => void;
}

interface SplitItem {
    id: string; // Temporary ID for UI
    name: string;
    amount: number;
    category: string;
    sub_category: string | null;
}

export const TransactionSplitModal = ({ open, onOpenChange, transaction, onSplitComplete }: TransactionSplitModalProps) => {
    const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();
    const [items, setItems] = useState<SplitItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize items when modal opens
    useEffect(() => {
        if (open && transaction) {
            if (items.length === 0) {
                // Start with one item representing the full transaction or predefined splits if we had them
                setItems([
                    {
                        id: crypto.randomUUID(),
                        name: transaction.merchant || 'Item 1',
                        amount: transaction.amount,
                        category: transaction.category || 'Other',
                        sub_category: transaction.sub_category || null
                    }
                ]);
            }
        } else {
            setItems([]);
        }
    }, [open, transaction]);

    const totalAllocated = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const remaining = transaction.amount - totalAllocated;
    const isBalanced = Math.abs(remaining) < 0.01;

    const handleAddItem = () => {
        setItems([
            ...items,
            {
                id: crypto.randomUUID(),
                name: '',
                amount: 0,
                category: 'Other',
                sub_category: null
            }
        ]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length <= 1) return;
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: keyof SplitItem, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const handleSave = async () => {
        if (!isBalanced) return;
        setIsSaving(true);
        try {
            // 1. Delete existing items for this transaction (if any, for updates) - though generic delete might be safer
            await supabase.from('transaction_items').delete().eq('transaction_id', transaction.id);

            // 2. Insert new items
            const { error: insertError } = await supabase.from('transaction_items').insert(
                items.map(item => ({
                    transaction_id: transaction.id,
                    name: item.name,
                    amount: item.amount,
                    category: item.category,
                    sub_category: item.sub_category
                }))
            );

            if (insertError) throw insertError;

            // 3. Mark transaction as split
            const { error: updateError } = await supabase
                .from('transactions')
                .update({ is_split: true })
                .eq('id', transaction.id);

            if (updateError) throw updateError;

            onOpenChange(false);
            onSplitComplete();
        } catch (err) {
            console.error('Failed to save splits:', err);
            alert('Failed to save split transaction. Check console.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Itemize Transaction</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Split <span className="font-bold">{transaction.merchant}</span> ({formatCurrency(transaction.amount, 'DKK')}) into multiple items.
                    </p>
                </DialogHeader>

                <div className="space-y-4 my-4">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
                        <div className="col-span-4">Item Name</div>
                        <div className="col-span-2 text-right">Amount</div>
                        <div className="col-span-3">Category</div>
                        <div className="col-span-3">Sub-Category</div>
                    </div>

                    {items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="col-span-4">
                                <Input
                                    value={item.name}
                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                    placeholder="e.g. Milk"
                                    className="h-8"
                                />
                            </div>
                            <div className="col-span-2">
                                <Input
                                    type="number"
                                    value={item.amount}
                                    onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value))}
                                    className="h-8 text-right font-mono"
                                />
                            </div>
                            <div className="col-span-3">
                                <Select
                                    value={item.category}
                                    onValueChange={(val) => {
                                        updateItem(item.id, 'category', val);
                                        updateItem(item.id, 'sub_category', null); // Reset sub
                                    }}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {displayCategories.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Select
                                    value={item.sub_category || ''}
                                    onValueChange={(val) => updateItem(item.id, 'sub_category', val)}
                                    disabled={!displaySubCategories?.[item.category]?.length}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {displaySubCategories?.[item.category]?.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                    onClick={() => handleRemoveItem(item.id)}
                                    disabled={items.length === 1}
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
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!isBalanced || isSaving}>
                            {isSaving ? 'Saving...' : 'Save Items'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
