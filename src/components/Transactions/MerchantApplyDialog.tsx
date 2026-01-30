
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowRight, Check, Sparkles, AlertCircle, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Transaction } from './hooks/useTransactionTable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { findSimilarTransactions } from '@/lib/merchantUtils';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { cleanMerchant } from '@/lib/importBrain';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MerchantApplyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction;
    targetMerchantName: string;
    allTransactions?: Transaction[];
    onSuccess?: () => void;
}

export const MerchantApplyDialog = ({
    open,
    onOpenChange,
    transaction,
    targetMerchantName,
    allTransactions = [],
    onSuccess
}: MerchantApplyDialogProps) => {
    const { settings } = useSettings();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { categories, subCategories } = useCategorySource(); // Fetch categories

    // UI State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showSimilarPreview, setShowSimilarPreview] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form State (Initialized from Rule, but editable)
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [activeSubCategory, setActiveSubCategory] = useState<string>('');
    const [activeRecurring, setActiveRecurring] = useState<string>('N/A');
    const [isUnplanned, setIsUnplanned] = useState(false); // Default false (Planned)
    const [isExcluded, setIsExcluded] = useState(false);

    // Fetch the target rule
    const { data: rule, isLoading } = useQuery({
        queryKey: ['merchant-rule', targetMerchantName],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('merchant_rules')
                .select('*')
                .eq('clean_merchant_name', targetMerchantName)
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: open && !!targetMerchantName
    });

    // Initialize Form State when Rule loads
    useEffect(() => {
        if (rule) {
            setActiveCategory(rule.auto_category || 'Other');
            setActiveSubCategory(rule.auto_sub_category || '');
            setActiveRecurring(rule.auto_recurring || 'N/A');
            setIsExcluded(rule.auto_budget === 'Exclude');
            // Unplanned defaults to FALSE per user request, ignoring rule reference unless we wanted to load it (which we explicitly decided not to default to)
            // But if user edits it, it stays edited.
        }
    }, [rule]);

    // Find similar transactions
    const similarMatches = useMemo(() => {
        if (!open) return [];
        const currentTxMock: any = { id: transaction.id, merchant: transaction.merchant, clean_merchant: transaction.clean_merchant, amount: transaction.amount };
        return findSimilarTransactions(currentTxMock, allTransactions, transaction.merchant);
    }, [open, transaction, allTransactions]);

    // Initialize selectedIds when similarMatches changes (same logic as before)
    useEffect(() => {
        if (open && similarMatches.length > 0) {
            const autoSelect = similarMatches
                .filter(m => m.score >= 60)
                .map(m => m.transaction.id);
            setSelectedIds(new Set(autoSelect));
            if (autoSelect.length > 0) setShowSimilarPreview(true);
        }
    }, [open, similarMatches]);

    // Apply Mutation uses the ACTIVE state values
    const applyMutation = useMutation({
        mutationFn: async () => {
            if (!rule) throw new Error("No rule found");
            if (!user?.id) throw new Error("User not authenticated");

            const newRulePayload: any = {
                merchant_name: cleanMerchant(transaction.merchant),
                clean_merchant_name: rule.clean_merchant_name,
                auto_category: activeCategory,        // Use edited value
                auto_sub_category: activeSubCategory, // Use edited value
                auto_recurring: activeRecurring,      // Use edited value
                auto_planned: !isUnplanned,           // Use edited value
                skip_triage: true,
                user_id: user.id,
                auto_budget: isExcluded ? 'Exclude' : null
            };

            const { error: ruleError } = await supabase
                .from('merchant_rules')
                .upsert([newRulePayload], { onConflict: 'user_id, merchant_name' });

            if (ruleError) {
                console.error("Rule creation failed:", ruleError);
                throw ruleError;
            }

            const updates: any = {
                clean_merchant: rule.clean_merchant_name,
                category: activeCategory,
                sub_category: activeSubCategory,
                recurring: activeRecurring,
                planned: !isUnplanned,
                excluded: isExcluded,
                status: 'Complete'
            };

            const idsToUpdate = [transaction.id, ...Array.from(selectedIds)];

            const { error } = await supabase
                .from('transactions')
                .update(updates)
                .in('id', idsToUpdate);

            if (error) throw error;
            return idsToUpdate.length;
        },
        onError: (err) => {
            toast.error(`Failed to map merchant: ${err.message}`);
        },
        onSuccess: async () => {
            toast.success(`Mapped rule and updated ${1 + selectedIds.size} transactions`);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['transactions'] }),
                queryClient.invalidateQueries({ queryKey: ['merchant-rules-simple'] }),
                queryClient.invalidateQueries({ queryKey: ['existing-merchant-names'] })
            ]);
            onOpenChange(false);
            if (onSuccess) onSuccess();
        }
    });

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`bg-white transition-[max-width] duration-300 ${showSimilarPreview ? 'max-w-3xl' : 'max-w-lg'}`}>
                <DialogHeader className="pb-4 border-b border-slate-100">
                    <DialogTitle className="flex items-center gap-2 text-blue-900 text-xl">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Apply Rule & Map Merchant
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Create a rule to map this merchant validation to existing settings.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-12 text-center text-slate-400">Loading rule details...</div>
                ) : !rule ? (
                    <div className="py-12 text-center text-rose-500 flex flex-col items-center gap-2">
                        <AlertCircle className="w-10 h-10 opacity-50" />
                        <p>Could not find original rule for <strong>{targetMerchantName}</strong></p>
                    </div>
                ) : (
                    <div className="space-y-6 pt-4">
                        {/* Mapping Info  */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-slate-500">Merchant Name (Rule to Apply)</Label>
                                <div className="flex items-center gap-2 text-lg font-bold text-blue-900 bg-white px-3 py-2 rounded border border-blue-100 shadow-sm">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    {targetMerchantName}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-slate-400">Original Transaction Name</Label>
                                <div className="font-mono text-xs text-slate-600 bg-slate-100/50 px-3 py-2 rounded border border-slate-200/50">
                                    {transaction.merchant}
                                </div>
                            </div>
                        </div>

                        {/* Diff View / Edit Form */}
                        <div className="space-y-4 px-2 relative">
                            {/* Edit Toggle Button */}
                            {!isEditing && (
                                <div className="absolute top-0 right-0 z-10">
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-6 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                        <Pencil className="w-3 h-3" /> Edit
                                    </Button>
                                </div>
                            )}

                            {/* Category Row */}
                            <div className="grid grid-cols-[1fr,auto,1.2fr] gap-4 items-center text-sm">
                                <div className="text-right">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Category</div>
                                    <div className="font-medium text-slate-700 truncate">{transaction.category || '-'}</div>
                                </div>
                                <div className="text-slate-300 flex justify-center"><ArrowRight className="w-4 h-4" /></div>
                                <div className="text-left">
                                    <div className="text-[10px] uppercase font-bold text-blue-400">New</div>
                                    {isEditing ? (
                                        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                            <Select value={activeCategory} onValueChange={(v) => { setActiveCategory(v); setActiveSubCategory(''); }}>
                                                <SelectTrigger className="h-8 text-xs bg-white border-blue-200 focus:ring-blue-100">
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Select value={activeSubCategory} onValueChange={setActiveSubCategory} disabled={!activeCategory}>
                                                <SelectTrigger className="h-8 text-xs bg-white border-blue-200 focus:ring-blue-100">
                                                    <SelectValue placeholder="Sub-category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(subCategories[activeCategory] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="font-bold text-blue-700">
                                            {activeCategory}
                                            {activeSubCategory && <span className="opacity-75 font-normal"> / {activeSubCategory}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Badges / Toggles Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">

                            {/* Left Side: Recurring & Excluded */}
                            <div className="flex gap-2 items-center">
                                {isEditing ? (
                                    <Select value={activeRecurring} onValueChange={setActiveRecurring}>
                                        <SelectTrigger className="h-7 text-xs w-[100px] bg-white border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['N/A', 'Monthly', 'Annually', 'Bi-annually', 'Quarterly', 'Weekly', 'One-off'].map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    activeRecurring && activeRecurring !== 'N/A' && (
                                        <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 h-6">{activeRecurring}</Badge>
                                    )
                                )}

                                {/* Excluded Toggle (Only show if editing or true) */}
                                {(isEditing || isExcluded) && (
                                    <div className="flex items-center gap-2">
                                        {isEditing && <Label htmlFor="edit-exclude" className="text-[10px] uppercase font-bold text-slate-400">Exclude</Label>}
                                        {isEditing ? (
                                            <Switch id="edit-exclude" checked={isExcluded} onCheckedChange={setIsExcluded} className="scale-75 origin-left" />
                                        ) : (
                                            isExcluded && <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-200 h-6">Excluded</Badge>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Unplanned Toggle */}
                            <div className="flex items-center gap-2">
                                <Label htmlFor="apply-unplanned" className="text-xs font-bold text-slate-500 uppercase">Unplanned</Label>
                                <Switch
                                    id="apply-unplanned"
                                    checked={isUnplanned}
                                    onCheckedChange={setIsUnplanned}
                                />
                            </div>
                        </div>

                        {/* Similar Transactions Selection */}
                        {similarMatches.length > 0 && (
                            <div className="border-t border-slate-100 pt-4 mt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowSimilarPreview(!showSimilarPreview)}>
                                        <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                            {similarMatches.length}
                                        </div>
                                        <Label className="text-sm font-medium text-slate-700 cursor-pointer">
                                            Similar transactions found
                                        </Label>
                                        <Badge variant="outline" className="ml-2 font-normal text-slate-500">
                                            {selectedIds.size} selected
                                        </Badge>
                                        {showSimilarPreview ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                    </div>
                                    {/* Global Checkbox for "Select All" */}
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-slate-400 cursor-pointer" onClick={() => {
                                            if (selectedIds.size === similarMatches.length) setSelectedIds(new Set());
                                            else setSelectedIds(new Set(similarMatches.map(m => m.transaction.id)));
                                        }}>
                                            {selectedIds.size === similarMatches.length ? "Deselect All" : "Select All"}
                                        </Label>
                                        <Checkbox
                                            checked={selectedIds.size === similarMatches.length && similarMatches.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedIds(new Set(similarMatches.map(m => m.transaction.id)));
                                                else setSelectedIds(new Set());
                                            }}
                                        />
                                    </div>
                                </div>

                                {showSimilarPreview && (
                                    <div className="mt-3 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-top-2 duration-200">
                                        <div className="max-h-[250px] overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-50 sticky top-0 border-b border-slate-100">
                                                    <tr className="text-slate-500 text-[10px] uppercase font-bold">
                                                        <th className="px-3 py-2 w-8 text-center">
                                                            {/* Header Checkbox */}
                                                        </th>
                                                        <th className="px-3 py-2 text-left">Date</th>
                                                        <th className="px-3 py-2 text-left">Original Name</th>
                                                        <th className="px-3 py-2 text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {similarMatches.map(({ transaction: t, score }) => (
                                                        <tr key={t.id} className={cn("hover:bg-blue-50/30 transition-colors cursor-pointer", selectedIds.has(t.id) && "bg-blue-50/20")} onClick={() => {
                                                            const newSet = new Set(selectedIds);
                                                            if (newSet.has(t.id)) newSet.delete(t.id);
                                                            else newSet.add(t.id);
                                                            setSelectedIds(newSet);
                                                        }}>
                                                            <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                                <Checkbox
                                                                    checked={selectedIds.has(t.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        const newSet = new Set(selectedIds);
                                                                        if (checked) newSet.add(t.id);
                                                                        else newSet.delete(t.id);
                                                                        setSelectedIds(newSet);
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{t.date}</td>
                                                            <td className="px-3 py-2 text-slate-700 truncate max-w-[200px]" title={t.merchant}>
                                                                {t.merchant}
                                                                {score < 60 && <span className="ml-2 text-[9px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-100">Partial</span>}
                                                            </td>
                                                            <td className={`px-3 py-2 text-right font-mono ${t.amount < 0 ? 'text-slate-700' : 'text-emerald-600'}`}>
                                                                {formatCurrency(t.amount, settings.currency)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="gap-3 sm:justify-between pt-4 border-t border-slate-100 mt-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-500 hover:text-slate-700">Cancel</Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 font-bold px-6 shadow-lg shadow-blue-100"
                        onClick={() => applyMutation.mutate()}
                        disabled={applyMutation.isPending || !rule}
                    >
                        {applyMutation.isPending ? "Applying..." : <><Check className="w-4 h-4 mr-2" /> Confirm & Map Rule</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
