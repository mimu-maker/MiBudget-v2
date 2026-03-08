import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Transaction } from './hooks/useTransactionTable';
import { addMonths, startOfMonth, format, parseISO } from 'date-fns';
import { formatBudgetMonth } from '@/lib/formatUtils';
import { Calendar, Split, Store, Pencil } from 'lucide-react';
import { TransactionSplitModal } from './TransactionSplitModal';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { APP_STATUSES } from '@/hooks/useSettings';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

interface TransactionEditDrawerProps {
    transaction: Transaction | null;
    onClose: () => void;
    onSave: (id: string, updates: Partial<Transaction>) => void;
}

export const TransactionEditDrawer = ({ transaction, onClose, onSave }: TransactionEditDrawerProps) => {
    const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();

    const [updates, setUpdates] = useState<Partial<Transaction>>({});
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

    useEffect(() => {
        setUpdates({});
    }, [transaction]);

    if (!transaction) return null;

    const handleChange = (field: keyof Transaction, value: any) => {
        setUpdates(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (Object.keys(updates).length > 0) {
            onSave(transaction.id, updates);
        }
        onClose();
    };

    const getValue = <K extends keyof Transaction>(field: K): Transaction[K] =>
        (updates[field] !== undefined ? updates[field] : transaction[field]) as Transaction[K];

    return (
        <>
            <Sheet open={!!transaction} onOpenChange={(open) => !open && onClose()}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto [&>button]:right-6 [&>button]:top-6 [&>button]:w-8 [&>button]:h-8 [&>button]:bg-slate-100 [&>button]:rounded-full [&>button]:items-center [&>button]:justify-center [&>button]:hover:bg-slate-200">
                    <SheetHeader className="mb-6 pr-8">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <SheetTitle className="text-xl">Edit Transaction</SheetTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    {(transaction.clean_source) ? (
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-sm py-1 px-2 rounded-xl gap-1.5 font-black shadow-sm transition-all hover:ring-2 hover:ring-blue-100 items-center">
                                            <Store className="w-3.5 h-3.5" />
                                            {transaction.clean_source}
                                        </Badge>
                                    ) : (
                                        <span className="font-bold text-slate-800">
                                            {transaction.source}
                                        </span>
                                    )}
                                </div>
                                <SheetDescription className="text-xs font-mono mt-1">
                                    Raw: {transaction.source} • {format(parseISO(transaction.date), 'MMM d, yyyy')}
                                </SheetDescription>
                            </div>
                            {!transaction.parent_id && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsSplitModalOpen(true)}
                                    className="h-8 px-3 text-xs font-bold gap-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200 mt-1"
                                >
                                    <Split className="w-3.5 h-3.5" /> Split
                                </Button>
                            )}
                        </div>
                    </SheetHeader>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={String(getValue('date') || '').substring(0, 10)}
                                    onChange={(e) => handleChange('date', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={getValue('amount') || ''}
                                    onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Source / Merchant</Label>
                                <Input
                                    value={getValue('source') || ''}
                                    onChange={(e) => handleChange('source', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={String(getValue('status') || '')} onValueChange={(val) => handleChange('status', val)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {APP_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Recurring</Label>
                                <Select value={String(getValue('recurring') || 'N/A')} onValueChange={(val) => handleChange('recurring', val)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['N/A', 'Monthly', 'Annually', 'Bi-annually', 'Quarterly', 'Weekly', 'One-off'].map(i => (
                                            <SelectItem key={i} value={i}>{i}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={String(getValue('category') || '')} onValueChange={(val) => {
                                    handleChange('category', val);
                                    handleChange('sub_category', null);
                                }}>
                                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
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
                                    <SelectTrigger><SelectValue placeholder="Select Subcategory" /></SelectTrigger>
                                    <SelectContent>
                                        {(getValue('category') ? displaySubCategories?.[String(getValue('category'))] || [] : []).map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 flex items-center justify-between col-span-1 pt-2">
                                <Label>Planned</Label>
                                <Switch checked={Boolean(getValue('planned'))} onCheckedChange={(val) => handleChange('planned', val)} />
                            </div>
                            <div className="space-y-2 flex items-center justify-between col-span-1 pt-2">
                                <Label>Excluded</Label>
                                <Switch checked={Boolean(getValue('excluded'))} onCheckedChange={(val) => handleChange('excluded', Boolean(val))} />
                            </div>
                        </div>

                        <Separator />
                        {/* Notes / Description Edit */}
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input
                                value={getValue('notes') || ''}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Add a note..."
                            />
                        </div>

                        <Separator />

                        {/* Discreet Budget Period Setting */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-amber-600" />
                                    Budget Period Allocation
                                </h4>
                                {getValue('budget_month') && (
                                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                        {formatBudgetMonth(String(getValue('budget_month')))}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Override the month this transaction counts towards in your budget.
                            </p>
                            <div className="space-y-2">
                                <Select
                                    value={getValue('budget_month') ? String(getValue('budget_month')) : 'auto'}
                                    onValueChange={(val) => {
                                        if (val === 'auto') {
                                            handleChange('budget_month', null);
                                            handleChange('budget_year', null);
                                        } else {
                                            const date = parseISO(val);
                                            handleChange('budget_month', val);
                                            handleChange('budget_year', date.getFullYear());
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select month..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto" className="font-medium text-amber-600">Auto (Based on Date)</SelectItem>
                                        {Array.from({ length: 36 }, (_, i) => {
                                            const date = addMonths(startOfMonth(new Date()), i - 12);
                                            return (
                                                <SelectItem key={i} value={format(date, 'yyyy-MM-01')}>
                                                    {format(date, 'MMM yyyy')}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            {getValue('budget_month') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-xs text-slate-500 hover:text-rose-600"
                                    onClick={() => {
                                        handleChange('budget_month', null);
                                        handleChange('budget_year', null);
                                    }}
                                >
                                    Clear explicitly allocated budget period
                                </Button>
                            )}
                        </div>
                    </div>

                    <SheetFooter className="mt-8 border-t pt-4">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave}>Save Changes</Button>
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
