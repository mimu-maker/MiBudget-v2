
import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Info, Check, ArrowRight, Zap, Store, Sparkles, X, History, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SourceNameSelector } from '../Transactions/SourceNameSelector';
import { useCategorySource, useUnifiedCategoryActions } from '@/hooks/useBudgetCategories';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { cleanSource } from '@/lib/importBrain';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatUtils';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { findSimilarTransactions } from '@/lib/sourceUtils';

export interface SourceRuleState {
    raw_name: string;
    name: string;
    category: string;
    sub_category: string;
    auto_planned: boolean;
    auto_exclude: boolean;
    match_mode: 'exact' | 'fuzzy';
    isGroupDefault?: boolean;
}

interface SourceRuleFormProps {
    initialRule: SourceRuleState;
    transactions?: any[];
    onSave: (rule: SourceRuleState, selectedIds: string[]) => void;
    onCancel: () => void;
    isSaving?: boolean;
    showFullForm?: boolean;
}

export const SourceRuleForm = ({
    initialRule,
    transactions = [],
    onSave,
    onCancel,
    isSaving = false,
    showFullForm = true
}: SourceRuleFormProps) => {
    const [rule, setRule] = useState<SourceRuleState>(initialRule);

    // Global Toggles
    const [applyToHistory, setApplyToHistory] = useState(true);
    const [showErrors, setShowErrors] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [showHistory, setShowHistory] = useState(false);

    const { settings } = useSettings();
    const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();
    const { addCategory, addSubCategory } = useUnifiedCategoryActions();

    // Reset rule if initialRule changes
    useEffect(() => {
        setRule(initialRule);
    }, [initialRule]);

    // --- Logic for Matching ---
    const similarTransactions = useMemo(() => {
        const currentTxMock: any = { id: 'current', source: rule.raw_name, clean_source: rule.name, amount: 0 };
        return findSimilarTransactions(currentTxMock, transactions, rule.name || rule.raw_name, rule.match_mode);
    }, [transactions, rule.name, rule.raw_name, rule.match_mode]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Auto-select high confidence matches when list changes
    useEffect(() => {
        const highConfidenceIds = similarTransactions
            .filter(m => m.score > 20)
            .map(m => m.transaction.id);
        setSelectedIds(new Set(highConfidenceIds));
    }, [similarTransactions]);

    const validate = (fullRule = true) => {
        const newErrors: Record<string, boolean> = {};
        if (!rule.name) newErrors.name = true;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = (fullRule = true) => {
        if (!validate(fullRule)) {
            setShowErrors(true);
            return;
        }

        const finalRule = fullRule ? {
            ...rule
        } : {
            ...rule,
            category: '',
            sub_category: '',
            auto_planned: true,
            auto_exclude: false
        };

        const finalSelectedIds = applyToHistory ? Array.from(selectedIds) : [];
        onSave(finalRule, finalSelectedIds);
    };

    const handleAddNewCategory = async () => {
        const name = prompt("Enter new category name:");
        if (name) {
            await addCategory(name);
            setRule(prev => ({ ...prev, category: name, sub_category: '' }));
        }
    };

    const handleAddNewSubCategory = async () => {
        if (!rule.category) return;
        const name = prompt(`Enter new sub-category for ${rule.category}:`);
        if (name) {
            await addSubCategory(rule.category, name);
            setRule(prev => ({ ...prev, sub_category: name }));
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-h-[85vh] overflow-y-auto px-4 py-2 custom-scrollbar">
            {/* 1. Identification Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Store className="w-12 h-12 text-blue-900" />
                </div>

                <div className="space-y-1.5 relative">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Source Clean Name (Pill Name)</Label>
                    </div>
                    <SourceNameSelector
                        value={rule.name}
                        disabled={rule.isGroupDefault}
                        onChange={(v) => {
                            setRule({ ...rule, name: v });
                            if (errors.name) setErrors(prev => ({ ...prev, name: false }));
                        }}
                        className={cn(
                            "h-12 text-lg font-bold bg-white shadow-md border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-blue-600",
                            showErrors && errors.name && "border-red-500 ring-2 ring-red-500/20",
                            rule.isGroupDefault && "opacity-80"
                        )}
                    />
                </div>

                <div className="space-y-1.5 relative">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Match Pattern (Raw Name Keyword)</Label>
                        {!rule.isGroupDefault && (
                            <div className="flex gap-1 shrink-0 -mt-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("h-5 text-[8px] px-1.5 font-black uppercase rounded-full transition-all", rule.match_mode === 'fuzzy' ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600")}
                                    onClick={() => setRule({ ...rule, match_mode: 'fuzzy' })}
                                >
                                    Fuzzy
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn("h-5 text-[8px] px-1.5 font-black uppercase rounded-full transition-all", rule.match_mode === 'exact' ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-slate-600")}
                                    onClick={() => setRule({ ...rule, match_mode: 'exact' })}
                                >
                                    Exact
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="relative group/input">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <Input
                            value={rule.raw_name}
                            disabled={rule.isGroupDefault}
                            onChange={(e) => setRule({ ...rule, raw_name: e.target.value })}
                            className={cn(
                                "h-12 pl-10 text-sm font-mono font-bold bg-white shadow-md border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all",
                                rule.isGroupDefault && "opacity-80"
                            )}
                            placeholder="Enter matching keyword..."
                        />
                    </div>
                </div>
            </div>

            {showFullForm && (
                <>
                    {/* 2. Categorization & Rules Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className={cn("text-[10px] uppercase font-black tracking-widest", showErrors && errors.category ? "text-red-500" : "text-slate-500")}>Category</Label>
                            <CategorySelector
                                value={rule.category}
                                onValueChange={(v) => {
                                    if (v === 'add-new') handleAddNewCategory();
                                    else {
                                        setRule({ ...rule, category: v, sub_category: '' });
                                        if (errors.category) setErrors(prev => ({ ...prev, category: false }));
                                    }
                                }}
                                disabled={rule.auto_exclude}
                                showAlwaysAsk={true}
                                className={cn(
                                    "h-11 shadow-sm border-slate-200 rounded-xl",
                                    showErrors && errors.category && "border-red-500 ring-2 ring-red-500/20"
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className={cn("text-[10px] uppercase font-black tracking-widest", showErrors && errors.sub_category ? "text-red-500" : "text-slate-500")}>Sub-category</Label>
                            <Select
                                value={rule.sub_category || 'always-ask'}
                                onValueChange={(v) => {
                                    if (v === 'always-ask') {
                                        setRule({ ...rule, sub_category: '' });
                                    } else if (v === 'add-new') {
                                        handleAddNewSubCategory();
                                    } else {
                                        setRule({ ...rule, sub_category: v });
                                        if (errors.sub_category) setErrors(prev => ({ ...prev, sub_category: false }));
                                    }
                                }}
                                disabled={!rule.category || rule.auto_exclude}
                            >
                                <SelectTrigger className={cn(
                                    "h-11 bg-white shadow-sm border-slate-200 rounded-xl",
                                    showErrors && errors.sub_category && "border-red-500 ring-2 ring-red-500/20"
                                )}>
                                    <SelectValue placeholder={rule.auto_exclude ? "N/A" : "Always Ask"} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200">
                                    <SelectItem value="always-ask" className="text-slate-500 font-bold italic">Always Ask</SelectItem>
                                    <SelectSeparator />
                                    {(displaySubCategories[rule.category || ''] || []).map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                    {rule.category && (
                                        <SelectItem value="add-new" className="text-blue-600 font-bold border-t mt-1">+ Add New Sub-category</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 3. Automation Row */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 shadow-inner">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-4">Automation & Rules</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Always Mark Unplanned */}
                            <div className={cn(
                                "p-4 rounded-xl border transition-all flex flex-col justify-between gap-3",
                                !rule.auto_planned ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-200"
                            )}>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-700">Always Mark Unplanned</Label>
                                    <Switch
                                        checked={!rule.auto_planned}
                                        onCheckedChange={(v) => setRule({ ...rule, auto_planned: !v })}
                                        disabled={rule.auto_exclude}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 italic leading-tight">
                                    Bypass budget period logic and mark as unplanned.
                                </p>
                            </div>

                            {/* Always Exclude */}
                            <div className={cn(
                                "p-4 rounded-xl border transition-all flex flex-col justify-between gap-3",
                                rule.auto_exclude ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200"
                            )}>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-700">Always Exclude</Label>
                                    <Switch
                                        checked={rule.auto_exclude}
                                        onCheckedChange={(v) => setRule({
                                            ...rule,
                                            auto_exclude: v
                                        })}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 italic leading-tight">
                                    Completely ignore this source in all calculations.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* 4. History Info & Control */}
            {!rule.isGroupDefault && (
                <div className="space-y-3">
                    <div
                        className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100 cursor-pointer hover:bg-blue-100/50 transition-colors shadow-sm"
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                <History className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-blue-900">
                                    This rule will apply to {similarTransactions.length} transactions
                                </p>
                                <p className="text-[10px] text-blue-700/70 uppercase font-black tracking-tighter">
                                    and all future imports.
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 rounded-full text-blue-600 hover:bg-blue-200/50">
                            {showHistory ? "Hide Details" : "Show Details"}
                        </Button>
                    </div>

                    {showHistory && similarTransactions.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-top-2 duration-300 shadow-xl bg-white">
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/50 sticky top-0 border-b z-10 backdrop-blur-md">
                                        <tr className="text-[10px] uppercase font-black text-slate-400">
                                            <th className="py-2.5 px-4 w-10 text-center">
                                                <Checkbox
                                                    checked={similarTransactions.length > 0 && selectedIds.size === similarTransactions.length}
                                                    onCheckedChange={(c) => setSelectedIds(c ? new Set(similarTransactions.map(m => m.transaction.id)) : new Set())}
                                                />
                                            </th>
                                            <th className="py-2.5 px-4 text-left">Matched Bank Records</th>
                                            <th className="py-2.5 px-4 text-right">Match</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {similarTransactions.map(({ transaction: tx, score }) => (
                                            <tr key={tx.id} className={cn("hover:bg-blue-50/30 transition-colors", selectedIds.has(tx.id) && "bg-blue-50/20")}>
                                                <td className="py-2.5 px-4 text-center">
                                                    <Checkbox
                                                        checked={selectedIds.has(tx.id)}
                                                        onCheckedChange={(c) => {
                                                            const n = new Set(selectedIds);
                                                            c ? n.add(tx.id) : n.delete(tx.id);
                                                            setSelectedIds(n);
                                                        }}
                                                    />
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 truncate" title={tx.source}>{tx.source}</span>
                                                        <div className="flex gap-2 text-[10px] font-medium text-slate-500">
                                                            <span>{tx.date}</span>
                                                            <span className={tx.amount < 0 ? "text-rose-500" : "text-emerald-600"}>
                                                                {formatCurrency(tx.amount, settings.currency)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4 text-right">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-black uppercase tracking-tighter px-2",
                                                        score >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                            score >= 60 ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-500 border-slate-100"
                                                    )}>
                                                        {score >= 90 ? "Exact" : score >= 60 ? "High" : "Score: " + score}
                                                    </Badge>
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

            {/* 5. Footer Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200 mt-2">
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    className="flex-1 font-black uppercase text-xs text-slate-400 hover:text-slate-600 rounded-xl h-12"
                >
                    Cancel
                </Button>

                <div className="flex-[2] flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleSave(false)}
                        disabled={!rule.name || isSaving}
                        className="flex-1 font-black uppercase text-xs text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl h-12"
                    >
                        Save Source
                    </Button>
                    <Button
                        className="flex-[1.5] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs shadow-xl shadow-blue-200 rounded-xl h-12"
                        disabled={!rule.name || isSaving}
                        onClick={() => handleSave(true)}
                    >
                        {isSaving ? "Saving..." : rule.isGroupDefault ? "Update Group Defaults" : "Save Rule"}
                    </Button>
                </div>
            </div>
        </div>
    );
};
