import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Store, Calendar, CreditCard, Tag, FileText, Info } from 'lucide-react';
import { Transaction } from './hooks/useTransactionTable';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { getStatusBadgeVariant } from './utils/transactionUtils';
import { cn } from '@/lib/utils';

interface TransactionDetailDialogProps {
    transaction: Transaction | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const TransactionDetailDialog = ({ transaction, open, onOpenChange }: TransactionDetailDialogProps) => {
    const { settings } = useSettings();
    if (!transaction) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                                <Store className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-white">
                                    {transaction.clean_merchant || transaction.merchant}
                                </DialogTitle>
                                <DialogDescription className="text-blue-100/80">
                                    Transaction ID: {transaction.id.slice(0, 8)}...
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-8 bg-background">
                    {/* Merchant Info Section */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Original Name</Label>
                            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border/50 text-sm font-medium">
                                <Info className="w-4 h-4 text-slate-400" />
                                {transaction.merchant}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Clean Match</Label>
                            <div className="flex items-center gap-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/50 min-h-[46px]">
                                {transaction.clean_merchant ? (
                                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border-blue-200 dark:border-blue-800 gap-1.5 py-1 px-3 rounded-full text-xs font-bold shadow-sm">
                                        <Store className="w-3 h-3" />
                                        {transaction.clean_merchant}
                                    </Badge>
                                ) : (
                                    <span className="text-xs text-slate-400 italic font-medium ml-1">No automated match found</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Financial Details */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Transaction Date</Label>
                            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/50">
                                <Calendar className="w-4 h-4 text-primary/60" />
                                <span className="text-sm font-semibold">{transaction.date}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Amount</Label>
                            <div className={cn(
                                "p-3 rounded-xl border flex items-center justify-center font-black text-lg shadow-sm ring-1 ring-inset",
                                transaction.amount >= 0
                                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-emerald-500/10"
                                    : "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 ring-rose-500/10"
                            )}>
                                {formatCurrency(transaction.amount, settings.currency)}
                            </div>
                        </div>
                    </div>

                    {/* Metadata Section */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Account & Method</Label>
                            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/50">
                                <CreditCard className="w-4 h-4 text-primary/60" />
                                <span className="text-sm font-semibold">{transaction.account}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Current Status</Label>
                            <div className="flex items-center py-1">
                                <Badge
                                    variant={getStatusBadgeVariant(transaction.status)}
                                    className="py-1 px-4 text-xs font-bold tracking-tight rounded-lg shadow-sm"
                                >
                                    {transaction.status}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Classification Section */}
                    <div className="space-y-3 p-4 bg-muted/10 rounded-2xl border border-dashed border-border/60">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 block">Classification</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-background rounded-lg border shadow-sm">
                                    <Tag className="w-4 h-4 text-primary/70" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold">Category</p>
                                    <p className="text-sm font-bold text-foreground">{transaction.category}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 border-l pl-4">
                                <div className="p-2 bg-background rounded-lg border shadow-sm">
                                    <Tag className="w-4 h-4 text-primary/30" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold">Sub-category</p>
                                    <p className="text-sm font-bold text-foreground">
                                        {transaction.sub_category || <span className="text-muted-foreground/40 italic font-normal">Unassigned</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description Section */}
                    {(transaction.description || transaction.merchant_description) && (
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Notes & Memo</Label>
                            <div className="p-4 bg-muted/20 rounded-xl border border-border/50 text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic flex gap-4">
                                <FileText className="w-5 h-5 text-primary/40 shrink-0 mt-0.5" />
                                <p>{transaction.description || transaction.merchant_description}</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-muted/20 border-t">
                    <Button
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                        className="font-bold px-6"
                    >
                        Dismiss
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
