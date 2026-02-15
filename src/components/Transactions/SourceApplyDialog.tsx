
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowRight, Check, Sparkles, AlertCircle, ChevronDown, ChevronUp, Pencil, Zap, Calendar, History } from 'lucide-react';
import { Transaction } from './hooks/useTransactionTable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { findSimilarTransactions } from '@/lib/sourceUtils';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { cleanSource } from '@/lib/importBrain';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";

interface SourceApplyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction;
    targetSourceName: string;
    allTransactions?: Transaction[];
    onSuccess?: () => void;
    minimal?: boolean;
}

export const SourceApplyDialog = ({
    open,
    onOpenChange,
    transaction,
    targetSourceName,
    allTransactions = [],
    onSuccess,
    minimal = true
}: SourceApplyDialogProps) => {
    const { settings } = useSettings();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { categories, subCategories } = useCategorySource();

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

    // Fetch the target rule (Check both new and legacy tables) AND Source Settings
    const { data: combinedData, isLoading } = useQuery({
        queryKey: ['source-rule-and-settings', targetSourceName],
        queryFn: async () => {
            // 1. Fetch Source Settings (Centralized)
            const { data: sourceSettings } = await supabase
                .from('sources')
                .select('*')
                .eq('name', targetSourceName)
                .maybeSingle();

            // 2. Check New Rule Table
            const { data: sourceRule, error: sourceError } = await supabase
                .from('source_rules')
                .select('*')
                .eq('clean_source_name', targetSourceName)
                .limit(1)
                .maybeSingle();

            if (sourceError) throw sourceError;

            let finalRule = sourceRule;

            // 3. Check Legacy Table if no new rule
            if (!finalRule) {
                const { data: merchantRule, error: merchantError } = await (supabase as any)
                    .from('merchant_rules')
                    .select('*')
                    .eq('clean_merchant_name', targetSourceName)
                    .limit(1)
                    .maybeSingle();

                if (merchantError) throw merchantError;

                if (merchantRule) {
                    finalRule = {
                        id: merchantRule.id,
                        clean_source_name: merchantRule.clean_merchant_name,
                        source_name: merchantRule.merchant_name,
                        auto_category: merchantRule.auto_category,
                        auto_sub_category: merchantRule.auto_sub_category,
                        // Legacy values might still be here, but we prefer 'sources' table
                        auto_planned: merchantRule.auto_planned,
                        auto_budget: merchantRule.auto_budget,
                        match_mode: merchantRule.match_mode || 'fuzzy'
                    };
                }
            }

            return { rule: finalRule, sourceSettings };
        },
        enabled: open && !!targetSourceName
    });

    // Initialize Form State
    useEffect(() => {
        if (combinedData) {
            const { rule, sourceSettings } = combinedData;

            // Prioritize Source Settings for recurring
            if (sourceSettings) {
                setActiveRecurring(sourceSettings.recurring || 'N/A');
            } else if (rule?.auto_recurring) {
                // Fallback to legacy rule setting if source setting missing
                setActiveRecurring(rule.auto_recurring);
            } else {
                setActiveRecurring('N/A');
            }

            if (rule) {
                setActiveCategory(rule.auto_category || 'Other');
                setActiveSubCategory(rule.auto_sub_category || '');
                setIsUnplanned(!rule.auto_planned); // Map to isUnplanned toggle
                setIsExcluded(rule.auto_budget === 'Exclude');
            }
        }
    }, [combinedData]);

    // Find similar transactions
    const similarMatches = useMemo(() => {
        if (!open) return [];
        const currentTxMock: any = { id: transaction.id, source: transaction.source, clean_source: transaction.clean_source, amount: transaction.amount };
        return findSimilarTransactions(currentTxMock, allTransactions, transaction.source);
    }, [open, transaction, allTransactions]);

    // Initialize selectedIds when similarMatches changes
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
            // if (!rule) throw new Error("No rule found"); // We might be creating a new one entirely or updating source settings only
            if (!user?.id) throw new Error("User not authenticated");

            // 1. Save Source Settings (Centralized)
            const { error: sourceError } = await supabase
                .from('sources')
                .upsert({
                    user_id: user.id,
                    name: combinedData?.rule?.clean_source_name || targetSourceName,
                    recurring: activeRecurring,
                    is_auto_complete: true // Implicitly true when applying rules via this dialog
                }, { onConflict: 'user_id, name' });

            if (sourceError) throw sourceError;

            // 2. Save Rule
            const newRulePayload: any = {
                source_name: cleanSource(transaction.source, settings.noiseFilters),
                clean_source_name: combinedData?.rule?.clean_source_name || targetSourceName,
                auto_category: activeCategory,        // Use edited value
                auto_sub_category: activeSubCategory, // Use edited value
                auto_planned: !isUnplanned,           // Use edited value
                user_id: user.id,
                auto_budget: isExcluded ? 'Exclude' : null
            };

            const { error: ruleError } = await supabase
                .from('source_rules')
                .upsert([newRulePayload], { onConflict: 'user_id, source_name' });

            if (ruleError) {
                console.error("Rule creation failed:", ruleError);
                throw ruleError;
            }

            const updates: any = {
                clean_source: combinedData?.rule?.clean_source_name || targetSourceName,
                // COMPATIBILITY: Ensure legacy clean_merchant is also set for Pending Action queries
                clean_merchant: combinedData?.rule?.clean_source_name || targetSourceName,
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
            toast.error(`Failed to map source: ${err.message}`);
        },
        onSuccess: async () => {
            toast.success(`Mapped rule and updated ${1 + selectedIds.size} transactions`);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['transactions'] }),
                queryClient.invalidateQueries({ queryKey: ['sources'] }), // Invalidate sources
                queryClient.invalidateQueries({ queryKey: ['source-rules-simple'] }),
                queryClient.invalidateQueries({ queryKey: ['existing-source-names'] })
            ]);
            onOpenChange(false);
            if (onSuccess) onSuccess();
        }
    });

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`bg-white transition-[max-width] duration-300 overflow-hidden rounded-3xl border-none shadow-2xl p-0 ${showSimilarPreview ? 'max-w-3xl' : 'max-w-lg'}`}>
                <div className="p-8 pb-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900 text-3xl font-black tracking-tight">
                            <Sparkles className="w-8 h-8 text-amber-500" />
                            Apply Rule & Map Source
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-base font-medium">
                            Map this transaction to an existing source rule and update future matches.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-8 pb-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="py-12 text-center text-slate-400">Loading rule details...</div>
                    ) : !combinedData ? (
                        <div className="py-12 text-center text-rose-500 flex flex-col items-center gap-2">
                            <AlertCircle className="w-10 h-10 opacity-50" />
                            <p>Could not find original rule for <strong>{targetSourceName}</strong></p>
                        </div>
                    ) : (
                        <>
                            {/* 1. Identification Summary  */}
                            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Source Selection</Label>
                                    <div className="flex items-center gap-2 text-xl font-black text-blue-900">
                                        <Zap className="w-5 h-5 text-blue-600" />
                                        {targetSourceName}
                                    </div>
                                </div>
                                <div className="md:text-right space-y-1">
                                    <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Current Transaction</Label>
                                    <div className="font-mono text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm inline-block">
                                        {transaction.source}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Rule Configuration Section - Hidden in minimal mode */}
                            {!minimal && (
                                <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100/50 space-y-6 relative">
                                    {!isEditing && (
                                        <div className="absolute top-6 right-6 z-10">
                                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-7 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 font-black text-[10px] uppercase tracking-wider rounded-full px-3">
                                                <Pencil className="w-3.5 h-3.5" /> Edit Defaults
                                            </Button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Category Column */}
                                        <div className="space-y-2.5">
                                            <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest block">Mapping Settings</Label>
                                            {isEditing ? (
                                                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                    <CategorySelector
                                                        value={activeCategory}
                                                        onValueChange={(v) => {
                                                            if (v.includes(':')) {
                                                                const [cat, sub] = v.split(':');
                                                                setActiveCategory(cat);
                                                                setActiveSubCategory(sub);
                                                            } else {
                                                                setActiveCategory(v);
                                                                setActiveSubCategory('');
                                                            }
                                                        }}
                                                        type="all"
                                                        className="h-12 shadow-md border-slate-200 rounded-2xl"
                                                    />
                                                    <Select value={activeSubCategory || 'always-ask'} onValueChange={(v) => setActiveSubCategory(v === 'always-ask' ? '' : v)} disabled={!activeCategory}>
                                                        <SelectTrigger className="h-12 bg-white shadow-md border-slate-200 rounded-2xl">
                                                            <SelectValue placeholder="Always Ask" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-slate-200">
                                                            <SelectItem value="always-ask" className="text-slate-500 font-bold italic">Always Ask</SelectItem>
                                                            <SelectSeparator />
                                                            {(subCategories[activeCategory] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ) : (
                                                <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-md flex items-center justify-between group h-[104px]">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Current Category</span>
                                                        <div className="font-black text-lg text-blue-900 leading-tight">
                                                            {activeCategory || <span className="text-slate-400 italic font-normal">Always Ask</span>}
                                                        </div>
                                                        {activeSubCategory && <div className="text-sm text-blue-600 font-bold">{activeSubCategory}</div>}
                                                    </div>
                                                    <div className="p-3 bg-blue-50 rounded-2xl group-hover:scale-110 transition-transform">
                                                        <Zap className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Recurring Column */}
                                        <div className="space-y-2.5">
                                            <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest block">Recurring Cadence</Label>
                                            {isEditing ? (
                                                <Select value={activeRecurring || 'always-ask'} onValueChange={(v) => setActiveRecurring(v === 'always-ask' ? '' : v)}>
                                                    <SelectTrigger className="h-12 bg-white shadow-md border-slate-200 rounded-2xl">
                                                        <SelectValue placeholder="Always Ask" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-slate-200">
                                                        <SelectItem value="always-ask" className="text-slate-500 font-bold italic">Always Ask</SelectItem>
                                                        <SelectSeparator />
                                                        {['Monthly', 'Annually', 'Bi-annually', 'Quarterly', 'Weekly', 'One-off'].map(opt => (
                                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-md flex items-center gap-4 h-[104px]">
                                                    <div className="p-3 bg-slate-50 rounded-2xl">
                                                        <Calendar className="w-6 h-6 text-slate-400" />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Budget Cadence</span>
                                                        <span className="font-black text-lg text-slate-800 leading-tight">{activeRecurring || 'Always Ask'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. Automation Panel - Hidden in minimal mode */}
                            {!minimal && (
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 shadow-inner">
                                    <div className="flex items-center justify-between mb-5">
                                        <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Visibility Controls</Label>
                                    </div>

                                    <div className={cn(
                                        "p-5 rounded-2xl border transition-all duration-300",
                                        isExcluded ? "bg-rose-50 border-rose-200 shadow-sm" : "bg-white border-slate-200"
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <Label htmlFor="edit-exclude" className="text-sm font-black text-slate-800">Always Exclude From Calculations</Label>
                                                <p className="text-[11px] text-slate-500 font-medium">Ignore this source in all spending charts and totals.</p>
                                            </div>
                                            {isEditing ? (
                                                <Switch
                                                    id="edit-exclude"
                                                    checked={isExcluded}
                                                    onCheckedChange={setIsExcluded}
                                                    className="data-[state=checked]:bg-rose-500 h-6 w-11 shadow-lg shadow-rose-100"
                                                />
                                            ) : (
                                                <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", isExcluded ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-500")}>
                                                    {isExcluded ? "Excluded" : "Visible"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 4. History Preview Panel */}
                            {similarMatches.length > 0 && (
                                <div className="space-y-4">
                                    <div
                                        className="flex justify-between items-center bg-blue-50/50 p-5 rounded-3xl border border-blue-100 cursor-pointer hover:bg-blue-100/50 transition-all duration-300 shadow-sm group"
                                        onClick={() => setShowSimilarPreview(!showSimilarPreview)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                                                <History className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-blue-950">
                                                    Apply to {selectedIds.size} potential bank records
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-blue-700/70 uppercase font-black tracking-tighter bg-blue-100/50 px-2 py-0.5 rounded">History Match</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-black text-[10px] text-blue-600 bg-white border-blue-100 uppercase tracking-widest">
                                                {selectedIds.size} selected
                                            </Badge>
                                            <div className="p-1.5 rounded-full bg-blue-100/50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                {showSimilarPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </div>
                                        </div>
                                    </div>

                                    {showSimilarPreview && (
                                        <div className="rounded-3xl border border-slate-200 overflow-hidden animate-in slide-in-from-top-4 duration-500 shadow-2xl bg-white border-none">
                                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Preview</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-[10px] font-black text-blue-600 hover:bg-blue-50 tracking-widest uppercase"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (selectedIds.size === similarMatches.length) setSelectedIds(new Set());
                                                        else setSelectedIds(new Set(similarMatches.map(m => m.transaction.id)));
                                                    }}
                                                >
                                                    {selectedIds.size === similarMatches.length ? "Deselect All" : "Select All"}
                                                </Button>
                                            </div>
                                            <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50/50 sticky top-0 border-b border-slate-100 z-10 backdrop-blur-md">
                                                        <tr className="text-[10px] uppercase font-black text-slate-400">
                                                            <th className="py-3 px-6 w-12 text-center"></th>
                                                            <th className="py-3 px-6 text-left tracking-widest">Bank Source</th>
                                                            <th className="py-3 px-6 text-right tracking-widest">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {similarMatches.map(({ transaction: t, score }) => (
                                                            <tr
                                                                key={t.id}
                                                                className={cn("hover:bg-blue-50/30 transition-colors cursor-pointer group/row", selectedIds.has(t.id) && "bg-blue-50/20")}
                                                                onClick={() => {
                                                                    const newSet = new Set(selectedIds);
                                                                    if (newSet.has(t.id)) newSet.delete(t.id);
                                                                    else newSet.add(t.id);
                                                                    setSelectedIds(newSet);
                                                                }}
                                                            >
                                                                <td className="py-3 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <Checkbox
                                                                        checked={selectedIds.has(t.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            const newSet = new Set(selectedIds);
                                                                            if (checked) newSet.add(t.id);
                                                                            else newSet.delete(t.id);
                                                                            setSelectedIds(newSet);
                                                                        }}
                                                                        className="rounded shadow-sm"
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-6">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="font-black text-slate-800 text-xs truncate max-w-[280px]" title={t.source}>{t.source}</span>
                                                                        <span className="text-[10px] text-slate-400 font-bold">{t.date}</span>
                                                                    </div>
                                                                </td>
                                                                <td className={cn("py-3 px-6 text-right font-mono text-xs font-black", t.amount < 0 ? "text-slate-700" : "text-emerald-600")}>
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
                        </>
                    )}
                </div>

                <DialogFooter className="p-8 pt-6 border-t border-slate-100 bg-slate-50/30 flex-col sm:flex-row gap-4 sm:justify-between items-center">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-slate-400 hover:text-slate-600 font-black uppercase text-[10px] tracking-widest h-12 rounded-2xl px-6 order-2 sm:order-1"
                    >
                        Cancel Changes
                    </Button>
                    <Button
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest h-14 px-10 rounded-2xl shadow-2xl shadow-blue-200 transition-all active:scale-95 order-1 sm:order-2 shrink-0 group"
                        onClick={() => applyMutation.mutate()}
                        disabled={applyMutation.isPending || !combinedData}
                    >
                        {applyMutation.isPending ? "Applying Updates..." : <>
                            <Check className="w-5 h-5 mr-3 group-hover:scale-125 transition-transform" />
                            Confirm & Map Source
                        </>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
