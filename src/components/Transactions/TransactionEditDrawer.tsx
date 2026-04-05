import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Transaction } from './hooks/useTransactionTable';
import { parseISO, format } from 'date-fns';
import { Split, Store, Pencil, Loader2 } from 'lucide-react';
import { TransactionSplitModal } from './TransactionSplitModal';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { APP_STATUSES } from '@/hooks/useSettings';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface TransactionEditDrawerProps {
    transaction: Transaction | null;
    onClose: () => void;
    onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

export const TransactionEditDrawer = ({ transaction, onClose, onSave }: TransactionEditDrawerProps) => {
    const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();

    const [updates, setUpdates] = useState<Partial<Transaction>>({});
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    const [isEditingCore, setIsEditingCore] = useState(false);
    const [isEditingSource, setIsEditingSource] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setUpdates({});
    }, [transaction]);

    if (!transaction) return null;

    const handleChange = (field: keyof Transaction, value: any) => {
        setUpdates(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (Object.keys(updates).length === 0) {
            onClose();
            return;
        }
        setIsSaving(true);
        try {
            await onSave(transaction.id, updates);
            setUpdates({});
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const getValue = <K extends keyof Transaction>(field: K): Transaction[K] =>
        (updates[field] !== undefined ? updates[field] : transaction[field]) as Transaction[K];

    return (
        <>
            <Sheet open={!!transaction} onOpenChange={(open) => !open && onClose()}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto [&>button]:right-6 [&>button]:top-6 [&>button]:w-8 [&>button]:h-8 [&>button]:bg-slate-100 [&>button]:rounded-full [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:p-0 [&>button]:hover:bg-slate-200">
                    <div className="mb-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <SheetTitle className="text-2xl font-extrabold tracking-tight">Edit Transaction</SheetTitle>
                                {isSaving && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg animate-in fade-in zoom-in duration-300">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Saving...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group text-left w-full transition-all hover:border-slate-200 shadow-sm">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-3 right-3 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-slate-200 shadow-sm rounded-full z-10"
                                onClick={() => setIsEditingCore(!isEditingCore)}
                            >
                                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                            </Button>
                            
                            <div className="space-y-3 w-full">
                                {/* Source Section */}
                                <div className="w-full">
                                    {isEditingSource ? (
                                        <Input
                                            autoFocus
                                            value={getValue('source') || ''}
                                            onChange={(e) => handleChange('source', e.target.value)}
                                            onBlur={() => setIsEditingSource(false)}
                                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingSource(false)}
                                            className="h-9 text-sm bg-white w-full border-slate-200 focus:ring-blue-100"
                                        />
                                    ) : (
                                        <div 
                                            className="group/source cursor-pointer flex items-center justify-between hover:bg-white/80 p-1.5 -ml-1.5 rounded-xl transition-all w-full"
                                            onClick={() => setIsEditingSource(true)}
                                        >
                                            <div className="flex flex-col gap-1.5 overflow-hidden">
                                                {getValue('clean_source') || transaction.clean_source ? (
                                                    <Badge variant="secondary" className="bg-blue-600 text-white border-transparent text-xs py-1 px-2.5 rounded-xl gap-1.5 font-bold shadow-sm items-center w-fit shrink-0">
                                                        <Store className="w-3 h-3" />
                                                        {getValue('clean_source') || transaction.clean_source}
                                                    </Badge>
                                                ) : (
                                                    <span className="font-bold text-slate-900 text-sm tracking-tight truncate">
                                                        {getValue('source') || transaction.source}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-mono text-slate-400 truncate pl-0.5" title={transaction.source}>
                                                    {transaction.source}
                                                </span>
                                            </div>
                                            <Pencil className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover/source:opacity-100 shrink-0" />
                                        </div>
                                    )}
                                </div>

                                <Separator className="bg-slate-200/60" />

                                <div className="space-y-3">
                                    {!isEditingCore ? (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Date</Label>
                                                <div className="font-bold text-slate-800 text-sm">{format(parseISO(String(getValue('date') || '')), 'MMM d, yyyy')}</div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Amount</Label>
                                                <div className="font-bold text-slate-900 text-sm tabular-nums">
                                                    {Number(getValue('amount')).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr.
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 w-full">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Date</Label>
                                                <Input
                                                    type="date"
                                                    value={String(getValue('date') || '').substring(0, 10)}
                                                    onChange={(e) => handleChange('date', e.target.value)}
                                                    className="h-9 text-sm bg-white border-slate-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Amount</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={getValue('amount') || ''}
                                                    onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                                                    className="h-9 text-sm bg-white font-bold border-slate-200"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {!transaction.parent_id && (
                                        <div className="pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsSplitModalOpen(true)}
                                                className="w-full h-8 text-[10px] uppercase tracking-widest font-black gap-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white hover:border-indigo-200 border-dashed border-slate-300 transition-all shadow-none"
                                            >
                                                <Split className="w-3 h-3" /> Split Transaction
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Status</Label>
                                <Select value={String(getValue('status') || '')} onValueChange={(val) => handleChange('status', val)}>
                                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {APP_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={String(getValue('category') || '')} onValueChange={(val) => {
                                    handleChange('category', val);
                                    handleChange('sub_category', null);
                                }}>
                                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Category" /></SelectTrigger>
                                    <SelectContent>
                                        {displayCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Subcategory</Label>
                                <Select
                                    disabled={!getValue('category')}
                                    value={String(getValue('sub_category') || '')}
                                    onValueChange={(val) => handleChange('sub_category', val)}
                                >
                                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Subcategory" /></SelectTrigger>
                                    <SelectContent>
                                        {(getValue('category') ? displaySubCategories?.[String(getValue('category'))] || [] : []).map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 flex items-center justify-between col-span-2 pt-2">
                                <Label className="text-slate-600 font-semibold">Exclude from Budget</Label>
                                <Switch checked={Boolean(getValue('excluded'))} onCheckedChange={(val) => handleChange('excluded', Boolean(val))} />
                            </div>
                        </div>

                        <Separator />
                        {/* Notes / Description Edit */}
                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Notes</Label>
                            <Textarea
                                value={getValue('notes') || ''}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Add detailed notes about this transaction..."
                                className="min-h-[120px] rounded-2xl bg-white border-slate-200 focus:ring-blue-50 text-sm resize-none"
                            />
                        </div>
                    </div>

                    <SheetFooter className="mt-8 border-t pt-4">
                        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
            {isSplitModalOpen && transaction && (
                <TransactionSplitModal
                    open={isSplitModalOpen}
                    onOpenChange={(open) => {
                        setIsSplitModalOpen(open);
                    }}
                    transaction={transaction}
                    onSplitComplete={() => {
                        onClose();
                    }}
                />
            )}
        </>
    );
};
