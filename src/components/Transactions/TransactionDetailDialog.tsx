import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Calendar, CreditCard, Tag, FileText, Info, Pencil, Save, X, RefreshCw, EyeOff, Link2Off, AlertTriangle, Check, Search } from 'lucide-react';
import { Transaction } from './hooks/useTransactionTable';
import { formatCurrency, formatDate } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { useProfile } from '@/contexts/ProfileContext';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { getStatusBadgeVariant } from './utils/transactionUtils';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';

interface TransactionDetailDialogProps {
    transaction: Transaction | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: (updates: Partial<Transaction>) => Promise<void>;
    initialEditMode?: boolean;
}

export const TransactionDetailDialog = ({ transaction, open, onOpenChange, onSave, initialEditMode = false }: TransactionDetailDialogProps) => {
    const { settings } = useSettings();
    const { userProfile } = useProfile();
    const { subCategories } = useCategorySource();
    const [isEditing, setIsEditing] = useState(initialEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [editedTx, setEditedTx] = useState<Partial<Transaction>>({});
    const [isConfirmingUnlink, setIsConfirmingUnlink] = useState(false);

    useEffect(() => {
        if (transaction && open) {
            setEditedTx({ ...transaction });
            setIsEditing(initialEditMode);
            setIsConfirmingUnlink(false);
        }
    }, [transaction, open, initialEditMode]);

    if (!transaction) return null;

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
            await onSave(editedTx);
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to save transaction corrections:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnlink = async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
            // Unlink clears clean_source and resets status
            await onSave({
                ...editedTx,
                clean_source: null,
                status: 'Pending Triage',
                category: 'Uncategorized',
                sub_category: null,
                confidence: 0
            });
            onOpenChange(false);
        } catch (err) {
            console.error("Failed to unlink transaction:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (field: keyof Transaction, value: any) => {
        setEditedTx(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl bg-slate-50">
                <div className="p-6 bg-white border-b relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                        <Store className="w-32 h-32 text-slate-900" />
                    </div>

                    <DialogHeader>
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm">
                                    <Store className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">
                                        {isEditing ? (
                                            <Input
                                                value={editedTx.clean_source || ''}
                                                onChange={(e) => updateField('clean_source', e.target.value)}
                                                className="h-8 py-0 px-2 text-xl font-black bg-slate-50 border-slate-200 focus:ring-blue-500 rounded-lg w-full max-w-[300px]"
                                                placeholder="Enter source name..."
                                            />
                                        ) : (
                                            transaction.clean_source || transaction.source
                                        )}
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium text-xs flex items-center gap-2">
                                        <span className="uppercase tracking-widest font-bold opacity-60">Transaction Details</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span className="font-mono">{transaction.id.slice(0, 8)}</span>
                                    </DialogDescription>
                                </div>
                            </div>

                            {onSave && !isSaving && (
                                <div className="flex items-center gap-2">
                                    {transaction.clean_source && !isEditing && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (isConfirmingUnlink) {
                                                    handleUnlink();
                                                } else {
                                                    setIsConfirmingUnlink(true);
                                                    setTimeout(() => setIsConfirmingUnlink(false), 3000);
                                                }
                                            }}
                                            className={cn(
                                                "h-9 px-3 text-[10px] font-black uppercase tracking-wider transition-all gap-2 rounded-xl",
                                                isConfirmingUnlink
                                                    ? "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200"
                                                    : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                            )}
                                        >
                                            {isConfirmingUnlink ? (
                                                <><AlertTriangle className="w-3.5 h-3.5" /> Confirm Unlink</>
                                            ) : (
                                                <><Link2Off className="w-3.5 h-3.5" /> Unlink</>
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditing(!isEditing)}
                                        className={cn(
                                            "h-9 px-3 text-[10px] font-black uppercase tracking-wider gap-2 rounded-xl border border-transparent transition-all",
                                            isEditing ? "bg-slate-100 text-slate-600 border-slate-200" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                        )}
                                    >
                                        {isEditing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                                        {isEditing ? "Cancel" : "Edit"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* CORE FLOW 1: Identification */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1 h-4 bg-blue-500 rounded-full" />
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step 1: Source Identification</Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm relative group/id overflow-hidden">
                            <div className="absolute -bottom-4 -right-4 p-6 opacity-[0.02] group-hover/id:opacity-[0.05] transition-opacity pointer-events-none rotate-12">
                                <Search className="w-24 h-24 text-slate-900" />
                            </div>

                            <div className="space-y-2 relative">
                                <Label className="text-[9px] font-bold text-slate-400 uppercase">Original Bank Record</Label>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-600 truncate flex items-center gap-2" title={transaction.source}>
                                    <Info className="w-3.5 h-3.5 opacity-40" />
                                    {transaction.source}
                                </div>
                            </div>

                            <div className="space-y-2 relative">
                                <Label className="text-[9px] font-bold text-slate-400 uppercase">Mapped Display Label</Label>
                                <div className={cn(
                                    "p-3 rounded-xl border flex items-center gap-2 min-h-[42px]",
                                    (isEditing ? editedTx.clean_source : transaction.clean_source) ? "bg-blue-50/50 border-blue-100" : "bg-slate-50/50 border-slate-100 border-dashed"
                                )}>
                                    {isEditing ? (
                                        <div className="flex items-center gap-2 w-full">
                                            <Store className="w-4 h-4 text-blue-400" />
                                            <Input
                                                value={editedTx.clean_source || ''}
                                                onChange={(e) => updateField('clean_source', e.target.value)}
                                                className="h-7 py-0 px-2 text-xs font-bold bg-transparent border-none focus-visible:ring-0 w-full"
                                                placeholder="Link to source name..."
                                            />
                                        </div>
                                    ) : (
                                        (transaction.clean_source || editedTx.clean_source) ? (
                                            <Badge variant="secondary" className="bg-blue-600 text-white border-blue-600 gap-1.5 py-1 px-3 rounded-lg text-xs font-black shadow-sm shadow-blue-200">
                                                <Store className="w-3 h-3" />
                                                {transaction.clean_source || editedTx.clean_source}
                                            </Badge>
                                        ) : (
                                            <span className="text-[11px] text-slate-400 italic">No associated source pattern</span>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-bold text-slate-400 uppercase">Transaction Date</Label>
                                <div className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-700">{formatDate(transaction.date, userProfile?.show_time, userProfile?.date_format)}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] font-bold text-slate-400 uppercase text-right block">Financial Amount</Label>
                                <div className={cn(
                                    "p-2 rounded-xl border flex items-center justify-end font-black text-base shadow-inner",
                                    transaction.amount >= 0
                                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-600"
                                        : "bg-rose-50/50 border-rose-100 text-rose-600"
                                )}>
                                    {formatCurrency(transaction.amount, settings.currency)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CORE FLOW 2: Categorization */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step 2: Financial Categorization</Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm relative group/cat overflow-hidden">
                            <div className="absolute -bottom-4 -right-4 p-6 opacity-[0.02] group-hover/cat:opacity-[0.05] transition-opacity pointer-events-none rotate-6">
                                <Tag className="w-24 h-24 text-slate-900" />
                            </div>

                            <div className="space-y-2 relative">
                                <Label className="text-[9px] font-bold text-slate-400 uppercase">Budget Category</Label>
                                {isEditing ? (
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
                                        className="h-10 shadow-sm border-slate-200 rounded-xl bg-slate-50"
                                    />
                                ) : (
                                    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100 min-h-[40px]">
                                        <div className="p-1.5 bg-white rounded-lg border shadow-xs">
                                            <Tag className="w-3.5 h-3.5 text-indigo-500" />
                                        </div>
                                        <span className="text-xs font-black text-slate-700">{transaction.category || 'Uncategorized'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 relative">
                                <Label className="text-[9px] font-bold text-slate-400 uppercase">Sub-category</Label>
                                {isEditing ? (
                                    <Select
                                        value={editedTx.sub_category || 'none'}
                                        onValueChange={(v) => updateField('sub_category', v === 'none' ? null : v)}
                                    >
                                        <SelectTrigger className="h-10 bg-slate-50 border-slate-200 shadow-sm text-xs rounded-xl font-bold">
                                            <SelectValue placeholder="Always Ask" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="none" className="text-slate-400 italic font-bold">Always Ask</SelectItem>
                                            {(subCategories[editedTx.category || ''] || []).map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100 min-h-[40px]">
                                        <div className="p-1.5 bg-white rounded-lg border shadow-xs">
                                            <Tag className="w-3.5 h-3.5 text-indigo-300" />
                                        </div>
                                        <span className={cn(
                                            "text-xs font-bold",
                                            transaction.sub_category ? "text-slate-700" : "text-slate-400 italic"
                                        )}>
                                            {transaction.sub_category || 'Always Ask'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CORE FLOW 3: Settings & Metadata */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step 3: Verification & Rules</Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Flags */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-[10px] font-black text-slate-700 uppercase">Planned Spending</Label>
                                        <p className="text-[9px] text-slate-400 italic leading-none">Expected in period?</p>
                                    </div>
                                    <Switch
                                        checked={!!(isEditing ? editedTx.planned : transaction.planned)}
                                        onCheckedChange={(v) => isEditing && updateField('planned', v)}
                                        disabled={!isEditing}
                                        className="data-[state=checked]:bg-emerald-500"
                                    />
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-[10px] font-black text-rose-600 uppercase">Exclude Value</Label>
                                        <p className="text-[9px] text-slate-400 italic leading-none">Ignore in calculations?</p>
                                    </div>
                                    <Switch
                                        checked={!!(isEditing ? editedTx.excluded : transaction.excluded)}
                                        onCheckedChange={(v) => isEditing && updateField('excluded', v)}
                                        disabled={!isEditing}
                                        className="data-[state=checked]:bg-rose-500"
                                    />
                                </div>
                            </div>

                            {/* Automation & Status */}
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold text-slate-400 uppercase">Processing Status</Label>
                                {isEditing ? (
                                    <Select
                                        value={editedTx.status || 'Pending Triage'}
                                        onValueChange={(v) => updateField('status', v)}
                                    >
                                        <SelectTrigger className="h-9 bg-slate-50 border-slate-200 shadow-sm text-[11px] font-black rounded-lg uppercase">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-lg">
                                            {['Pending Triage', 'Complete', 'Reconciled', 'Pending Reconciliation', 'Review Needed'].map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Badge
                                        variant={getStatusBadgeVariant(transaction.status)}
                                        className="w-full justify-center h-6 text-[9px] font-black uppercase tracking-tight rounded-lg shadow-sm"
                                    >
                                        {transaction.status}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metadata & Notes */}
                    {(isEditing || transaction.notes || transaction.description || transaction.source_description) && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1 h-3 bg-slate-300 rounded-full" />
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Logging</Label>
                            </div>
                            {isEditing ? (
                                <Textarea
                                    value={editedTx.notes || ''}
                                    onChange={(e) => updateField('notes', e.target.value)}
                                    placeholder="Add corrections or internal notes..."
                                    className="min-h-[80px] text-xs font-medium bg-white border-slate-200 shadow-sm rounded-xl resize-none focus:ring-blue-500"
                                />
                            ) : (
                                <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm text-[11px] text-slate-500 leading-relaxed italic flex gap-3 relative group/notes overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none">
                                        <FileText className="w-8 h-8 text-slate-900" />
                                    </div>
                                    <FileText className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                                    <div className="space-y-1 relative">
                                        {transaction.notes && <p className="font-semibold text-slate-600">"{transaction.notes}"</p>}
                                        {(transaction.description || transaction.source_description) && (
                                            <p className="opacity-60 font-medium">{transaction.description || transaction.source_description}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-white border-t flex items-center justify-between gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="font-black uppercase text-xs text-slate-400 hover:text-slate-800 h-11 px-6 rounded-xl hover:bg-slate-50"
                    >
                        Dismiss
                    </Button>
                    {isEditing ? (
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs px-10 h-11 rounded-xl shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
                        >
                            {isSaving ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Update Record
                        </Button>
                    ) : onSave && (
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => setIsEditing(true)}
                                className="bg-slate-900 hover:bg-black text-white font-black uppercase text-xs px-10 h-11 rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center gap-2"
                            >
                                <Pencil className="w-4 h-4" />
                                Modify Transaction
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
