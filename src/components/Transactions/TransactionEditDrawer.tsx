import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Transaction } from './hooks/useTransactionTable';
import { addMonths, startOfMonth, format, parseISO } from 'date-fns';
import { formatBudgetMonth } from '@/lib/formatUtils';
import { Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

interface TransactionEditDrawerProps {
    transaction: Transaction | null;
    onClose: () => void;
    onSave: (id: string, updates: Partial<Transaction>) => void;
}

export const TransactionEditDrawer = ({ transaction, onClose, onSave }: TransactionEditDrawerProps) => {
    if (!transaction) return null;

    return (
        <Sheet open={!!transaction} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-xl">Edit Transaction</SheetTitle>
                    <SheetDescription>
                        {transaction.clean_source || transaction.source} - {format(parseISO(transaction.date), 'MMM d, yyyy')}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Notes / Description Edit */}
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Input
                            defaultValue={transaction.notes || ''}
                            onBlur={(e) => onSave(transaction.id, { notes: e.target.value })}
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
                            {transaction.budget_month && (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                    {formatBudgetMonth(transaction.budget_month)}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Override the month this transaction counts towards in your budget.
                        </p>
                        <div className="space-y-2">
                            <Select
                                value={transaction.budget_month || 'auto'}
                                onValueChange={(val) => {
                                    if (val === 'auto') {
                                        onSave(transaction.id, { budget_month: null, budget_year: null });
                                    } else {
                                        const date = parseISO(val);
                                        onSave(transaction.id, {
                                            budget_month: val,
                                            budget_year: date.getFullYear()
                                        });
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
                        {transaction.budget_month && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-slate-500 hover:text-rose-600"
                                onClick={() => onSave(transaction.id, { budget_month: null, budget_year: null })}
                            >
                                Clear explicitly allocated budget period
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
