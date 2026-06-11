import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Store, ArrowRight, History, Search, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SourceNameSelector } from '../Transactions/SourceNameSelector';
import { useCategorySource, useUnifiedCategoryActions } from '@/hooks/useBudgetCategories';
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
    secondary_categories: string[];
    auto_planned: boolean;
    auto_exclude: boolean;
    match_mode: 'exact' | 'contains';
    isGroupDefault?: boolean;
}

export type SourceRuleMode = 'create' | 'source' | 'pattern';

interface SourceRuleFormProps {
    initialRule: SourceRuleState;
    transactions?: any[];
    onSave: (rule: SourceRuleState, selectedIds: string[]) => void;
    onCancel: () => void;
    isSaving?: boolean;
    showFullForm?: boolean;
    mode?: SourceRuleMode;
}

export const SourceRuleForm = ({
    initialRule,
    transactions = [],
    onSave,
    onCancel,
    isSaving = false,
    showFullForm = true,
    mode = 'create'
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
        return [];
        // Disabled for performance
        // const currentTxMock: any = { id: 'current', source: rule.raw_name, clean_source: rule.name, amount: 0 };
        // return findSimilarTransactions(currentTxMock, transactions, rule.name || rule.raw_name, rule.match_mode);
    }, [transactions, rule.name, rule.raw_name, rule.match_mode]);

    // --- Contains-rule risk analysis ---
    // Computed live whenever the user types a pattern or toggles match mode.
    // Tells them: how many transactions this rule hits, and how many of those
    // are already mapped to a DIFFERENT clean_name (collision = silent re-categorisation).
    const containsRisk = useMemo(() => {
        const pattern = rule.raw_name.trim().toLowerCase();
        if (rule.match_mode !== 'contains' || !pattern) return null;

        const riskLevel: 'high' | 'medium' | 'low' =
            pattern.length <= 5 ? 'high' : pattern.length <= 10 ? 'medium' : 'low';

        const matching = transactions.filter(tx =>
            (tx.source || '').toLowerCase().includes(pattern)
        );

        // Collisions: already has a clean_source that points somewhere ELSE
        const collisionSources = new Map<string, number>();
        matching.forEach(tx => {
            const existing = tx.clean_source?.trim();
            if (existing && existing.toLowerCase() !== rule.name.toLowerCase()) {
                collisionSources.set(existing, (collisionSources.get(existing) ?? 0) + 1);
            }
        });

        return {
            riskLevel,
            matchCount: matching.length,
            collisionCount: Array.from(collisionSources.values()).reduce((a, b) => a + b, 0),
            collisionSources, // Map<existingCleanName, count>
        };
    }, [rule.match_mode, rule.raw_name, rule.name, transactions]);

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
        if (mode !== 'pattern' && !rule.name) newErrors.name = true;
        if (mode === 'pattern' && !rule.raw_name) newErrors.raw_name = true;
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
            secondary_categories: [],
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

    const isSourceMode = mode === 'source';
    const isPatternMode = mode === 'pattern';

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300 px-1 py-1">

            {/* 1. COMPACT MAPPING HEADER (Source & Pattern Modes) */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-start gap-3">

                    {/* LEFT: Origin (Pattern or Group) */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                Pattern Text
                            </Label>
                            <div className="flex gap-0.5 bg-slate-200/50 p-0.5 rounded-md">
                                {(['contains', 'exact'] as const).map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setRule({ ...rule, match_mode: m })}
                                        className={cn(
                                            "px-1.5 py-0.5 text-[9px] font-bold rounded uppercase transition-all",
                                            rule.match_mode === m
                                                ? "bg-white shadow-sm text-blue-600"
                                                : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative group/input">
                            <Input
                                value={rule.raw_name}
                                onChange={(e) => setRule({ ...rule, raw_name: e.target.value })}
                                className={cn(
                                    "h-9 text-sm font-mono bg-white border-slate-200 focus-visible:ring-blue-500",
                                    errors.raw_name && "border-red-500 ring-1 ring-red-500",
                                    containsRisk?.riskLevel === 'high' && "border-red-400",
                                    containsRisk?.riskLevel === 'medium' && "border-amber-400",
                                )}
                                placeholder="Keyword to match (e.g. SPAR)..."
                            />
                        </div>

                        {/* Blast radius / collision warning — only for contains rules */}
                        {containsRisk && (
                            <div className={cn(
                                "mt-1.5 rounded-lg border px-2.5 py-2 text-[11px] leading-snug space-y-1 animate-in fade-in slide-in-from-top-1 duration-200",
                                containsRisk.riskLevel === 'high'
                                    ? "bg-red-50 border-red-200 text-red-800"
                                    : containsRisk.riskLevel === 'medium'
                                    ? "bg-amber-50 border-amber-200 text-amber-800"
                                    : "bg-slate-50 border-slate-200 text-slate-600"
                            )}>
                                {/* Risk tier label */}
                                <div className="flex items-center gap-1.5 font-black uppercase tracking-wide text-[10px]">
                                    {containsRisk.riskLevel === 'high' && <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
                                    {containsRisk.riskLevel === 'medium' && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                                    {containsRisk.riskLevel === 'low' && <Info className="w-3.5 h-3.5 shrink-0" />}
                                    {containsRisk.riskLevel === 'high'
                                        ? 'High risk — pattern is too short'
                                        : containsRisk.riskLevel === 'medium'
                                        ? 'Medium risk — verify matches below'
                                        : 'Contains match'}
                                </div>

                                {/* Blast radius */}
                                <div className="font-medium">
                                    {containsRisk.matchCount === 0
                                        ? 'No existing transactions match this pattern.'
                                        : <>Matches <strong>{containsRisk.matchCount}</strong> existing transaction{containsRisk.matchCount !== 1 ? 's' : ''}.</>
                                    }
                                </div>

                                {/* Collision warning */}
                                {containsRisk.collisionCount > 0 && (
                                    <div className={cn(
                                        "flex flex-col gap-0.5 pt-1 border-t font-semibold",
                                        containsRisk.riskLevel === 'high'
                                            ? "border-red-200 text-red-700"
                                            : "border-amber-200 text-amber-700"
                                    )}>
                                        <span className="flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3 shrink-0" />
                                            {containsRisk.collisionCount} already mapped elsewhere — rule would silently re-categorise:
                                        </span>
                                        {Array.from(containsRisk.collisionSources.entries()).map(([name, count]) => (
                                            <span key={name} className="pl-4 font-mono text-[10px]">
                                                "{name}" × {count}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* MIDDLE: Arrow */}
                    <div className="flex flex-col items-center justify-center mt-4 md:mt-2 shrink-0 px-2 group/maps">
                        <span className="text-[10px] uppercase font-black text-blue-400 tracking-widest leading-none mb-1.5 group-hover/maps:text-blue-500 transition-colors">Maps To</span>
                        <div className="w-full flex items-center relative h-1 min-w-[60px]">
                            <div className="h-[2px] w-full bg-blue-500/60 rounded-full relative shadow-sm">
                                <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t-2 border-r-2 border-blue-500 rotate-45 rounded-tr-[1px]" />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Destination (Clean Name) */}
                    <div className="flex-1 min-w-0">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                            Mapped Source
                        </Label>

                        <SourceNameSelector
                            value={rule.name}
                            disabled={rule.isGroupDefault && isSourceMode} // Editable in Pattern Mode now!
                            onChange={(v) => {
                                setRule({ ...rule, name: v });
                                if (errors.name) setErrors(prev => ({ ...prev, name: false }));
                            }}
                            className={cn(
                                "h-9 text-sm font-bold bg-white border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all text-blue-700",
                                errors.name && "border-red-500 ring-1 ring-red-500"
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* 2. CATEGORIZATION & RULES (Source Mode Only) */}
            {showFullForm && !isPatternMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Categories Column */}
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Category</Label>
                            <Select
                                value={rule.category || 'always-ask'}
                                onValueChange={(v) => {
                                    if (v === 'always-ask') {
                                        setRule({ ...rule, category: '', sub_category: '' });
                                    } else if (v === 'add-new') {
                                        handleAddNewCategory();
                                    } else {
                                        setRule({ ...rule, category: v, sub_category: '' });
                                        if (errors.category) setErrors(prev => ({ ...prev, category: false }));
                                    }
                                }}
                                disabled={rule.auto_exclude}
                            >
                                <SelectTrigger className={cn("h-9 bg-white border-slate-200 text-xs font-medium", errors.category && "border-red-500")}>
                                    <SelectValue placeholder="Always Ask" />
                                </SelectTrigger>
                                <SelectContent className="h-[250px]">
                                    <SelectItem value="always-ask" className="text-slate-500 font-bold italic border-b bg-slate-50/50">Always Ask</SelectItem>
                                    <SelectItem value="add-new" className="text-blue-600 font-bold border-b mb-1">+ Add New Category</SelectItem>
                                    {(displayCategories || []).map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Sub-category</Label>
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
                                <SelectTrigger className={cn("h-9 bg-white border-slate-200 text-xs font-medium", errors.sub_category && "border-red-500")}>
                                    <SelectValue placeholder={!rule.category ? "Select Category First" : (rule.auto_exclude ? "N/A" : "Always Ask")} />
                                </SelectTrigger>
                                <SelectContent>
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

                        {/* Secondary Categories Selection array */}
                        <div className="space-y-1.5 pt-2 border-t mt-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Secondary Categories (Optional)</Label>
                            <Select
                                value=""
                                onValueChange={(v) => {
                                    if (v && !rule.secondary_categories.includes(v)) {
                                        setRule({ ...rule, secondary_categories: [...rule.secondary_categories, v] });
                                    }
                                }}
                            >
                                <SelectTrigger className="h-8 bg-white border-slate-200 text-xs font-medium">
                                    <SelectValue placeholder="Add Category..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[250px] overflow-y-auto">
                                    {(displayCategories || []).filter(c => c !== rule.category && !rule.secondary_categories.includes(c)).map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Selected Secondary Badges */}
                            {rule.secondary_categories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {rule.secondary_categories.map(cat => (
                                        <Badge key={cat} variant="secondary" className="bg-slate-100 text-xs text-slate-700 py-0.5 px-2 font-medium border border-slate-200">
                                            {cat}
                                            <button
                                                onClick={() => setRule({ ...rule, secondary_categories: rule.secondary_categories.filter(c => c !== cat) })}
                                                className="ml-1.5 text-slate-400 hover:text-rose-500 font-bold"
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Automation Column */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Rules</Label>
                        <div className={cn(
                            "p-3 rounded-lg border flex items-center justify-between gap-3 h-[78px]",
                            rule.auto_exclude ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200"
                        )}>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-700 block">Always Exclude</Label>
                                <p className="text-[10px] text-slate-400 leading-tight pr-2">
                                    Source data will be hidden from budget & spending.
                                </p>
                            </div>
                            <Switch
                                checked={rule.auto_exclude}
                                onCheckedChange={(v) => setRule({ ...rule, auto_exclude: v })}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 3. HISTORY FOOTER (Source Mode Only) */}
            {isSourceMode && !rule.isGroupDefault && (
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 mt-1">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <History className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-medium text-slate-600">
                                Applies to <strong className="text-slate-800">{similarTransactions.length}</strong> transactions
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowHistory(!showHistory)}
                            className="h-6 text-[10px] uppercase font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                            {showHistory ? "Hide" : "View"}
                        </Button>
                    </div>

                    {showHistory && similarTransactions.length > 0 && (
                        <div className="mt-3 max-h-[150px] overflow-y-auto custom-scrollbar bg-white rounded border border-slate-200">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 sticky top-0 border-b z-10">
                                    <tr className="text-[9px] uppercase font-bold text-slate-400 text-left">
                                        <th className="py-1.5 px-3">Date</th>
                                        <th className="py-1.5 px-3">Source</th>
                                        <th className="py-1.5 px-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {similarTransactions.map(({ transaction: tx }) => (
                                        <tr key={tx.id} className="hover:bg-slate-50">
                                            <td className="py-1.5 px-3 font-mono text-[10px] text-slate-500">{tx.date}</td>
                                            <td className="py-1.5 px-3 text-slate-700 truncate max-w-[120px]" title={tx.source}>{tx.source}</td>
                                            <td className={cn("py-1.5 px-3 text-right font-medium", tx.amount < 0 ? "text-slate-900" : "text-emerald-600")}>
                                                {formatCurrency(tx.amount, settings.currency)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* 4. ACTIONS */}
            <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-100">
                <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                    Cancel
                </Button>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 min-w-[100px]"
                        disabled={(!rule.name && !isPatternMode) || (!rule.raw_name && isPatternMode) || isSaving}
                        onClick={() => handleSave(true)}
                    >
                        {isSaving ? "Saving..." : "Save Rule"}
                    </Button>
                </div>
            </div>
        </div>
    );
};
