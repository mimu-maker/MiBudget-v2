
import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Info, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MerchantNameSelector } from '../Transactions/MerchantNameSelector';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { cleanMerchant } from '@/lib/importBrain';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { findSimilarTransactions, SimilarTransactionMatch } from '@/lib/merchantUtils';

export interface MerchantRuleState {
    raw_name: string;
    name: string;
    category: string;
    sub_category: string;
    auto_recurring: string;
    auto_planned: boolean;
    auto_exclude: boolean;
    skip_triage: boolean;
}

interface MerchantRuleFormProps {
    initialRule: MerchantRuleState;
    transactions?: any[];
    onSave: (rule: MerchantRuleState, selectedIds: string[]) => void;
    onCancel: () => void;
    isSaving?: boolean;
}

export const MerchantRuleForm = ({ initialRule, transactions = [], onSave, onCancel, isSaving = false }: MerchantRuleFormProps) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [rule, setRule] = useState<MerchantRuleState>(initialRule);

    // Step 2 Toggles
    const [applyToHistory, setApplyToHistory] = useState(true);
    const [autoCompleteFuture, setAutoCompleteFuture] = useState(true);

    const { settings } = useSettings();
    const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();

    // Reset rule if initialRule changes
    useEffect(() => {
        setRule(initialRule);
    }, [initialRule]);

    // --- Logic for Step 1: Matching ---
    const similarTransactions = useMemo(() => {
        // Find matches based on the CURRENT display name (rule.name) if available, otherwise raw name for initial lookup?
        // Actually, matching logic should be based on the RAW input name from the *current* transaction (which is in initialRule.raw_name)
        // AND the new Display Name (rule.name) helps find others that might already be cleaned?
        // The findSimilarTransactions utility takes (currentTx, allTxs, INPUT_STRING).
        // We want to find transactions that match the 'Input Name' (rule.raw_name) or the new 'Display Name' (rule.name).

        // Let's create a 'mock' current transaction from the rule
        const currentTxMock: any = { id: 'current', merchant: rule.raw_name, clean_merchant: rule.name, amount: 0 };

        return findSimilarTransactions(currentTxMock, transactions, rule.name || rule.raw_name);
    }, [transactions, rule.name, rule.raw_name]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Auto-select high confidence matches when list changes
    useEffect(() => {
        const highConfidenceIds = similarTransactions
            .filter(m => m.score > 20) // Default threshold
            .map(m => m.transaction.id);
        setSelectedIds(new Set(highConfidenceIds));
    }, [similarTransactions]);

    // Sync Toggles to Rule State
    useEffect(() => {
        setRule(prev => ({
            ...prev,
            skip_triage: autoCompleteFuture
        }));
    }, [autoCompleteFuture]);

    const handleSave = () => {
        const finalSelectedIds = applyToHistory ? Array.from(selectedIds) : [];
        onSave(rule, finalSelectedIds);
    };

    if (step === 1) {
        return (
            <div className="bg-white p-6 rounded-xl border-2 border-blue-100 shadow-xl animate-in slide-in-from-left-2 duration-300">
                <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4 mb-4">
                        <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            Identify Merchant
                        </h3>
                        <p className="text-sm text-slate-500 ml-8">Name the merchant and identify similar transactions.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-500">Display Name</Label>
                            <MerchantNameSelector
                                value={rule.name}
                                onChange={(v) => setRule({ ...rule, name: v })}
                                className="h-12 text-lg"
                            />
                        </div>
                        <div className="space-y-1 px-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Input Name (Bank Text)</Label>
                            <p className="text-sm font-mono text-slate-500 truncate bg-slate-50 p-2 rounded border border-slate-100">{rule.raw_name}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-700">Similar Transactions ({similarTransactions.length})</Label>
                            <Badge variant="outline" className="font-normal text-slate-500">
                                {selectedIds.size} selected
                            </Badge>
                        </div>

                        <div className="max-h-[250px] overflow-y-auto border rounded-lg bg-white shadow-inner">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 sticky top-0 border-b z-10">
                                    <tr className="text-[10px] uppercase font-black text-slate-400">
                                        <th className="py-2 px-3 w-10 text-center">
                                            <Checkbox
                                                checked={similarTransactions.length > 0 && selectedIds.size === similarTransactions.length}
                                                onCheckedChange={(c) => setSelectedIds(c ? new Set(similarTransactions.map(m => m.transaction.id)) : new Set())}
                                            />
                                        </th>
                                        <th className="py-2 px-3 text-left">Details</th>
                                        <th className="py-2 px-3 text-right">Match</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {similarTransactions.map(({ transaction: tx, score, matchType }) => (
                                        <tr key={tx.id} className={cn("hover:bg-blue-50/50 transition-colors", selectedIds.has(tx.id) && "bg-blue-50/30")}>
                                            <td className="py-2 px-3 text-center">
                                                <Checkbox
                                                    checked={selectedIds.has(tx.id)}
                                                    onCheckedChange={(c) => {
                                                        const n = new Set(selectedIds);
                                                        c ? n.add(tx.id) : n.delete(tx.id);
                                                        setSelectedIds(n);
                                                    }}
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700 truncate max-w-[200px]" title={tx.merchant}>{tx.merchant}</span>
                                                    <div className="flex gap-2 text-[10px] text-slate-500">
                                                        <span>{tx.date}</span>
                                                        <span className={tx.amount < 0 ? "text-slate-700 font-mono" : "text-emerald-600 font-mono"}>
                                                            {formatCurrency(tx.amount, settings.currency)}
                                                        </span>
                                                        {tx.category && <span className="italic opacity-70"> • {tx.category}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                <Badge variant="secondary" className={cn(
                                                    "text-[10px] font-normal",
                                                    score >= 90 ? "bg-emerald-100 text-emerald-700" :
                                                        score >= 60 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                                                )}>
                                                    {score >= 90 ? "Exact" : score >= 60 ? "High" : "Poss."}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {similarTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-slate-400 italic text-sm">
                                                No similar transactions found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-100">
                        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 font-bold px-6"
                            disabled={!rule.name}
                            onClick={() => setStep(2)}
                        >
                            Next <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl border-2 border-blue-100 shadow-xl animate-in slide-in-from-right-2 duration-300">
            <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 mb-4">
                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                        Categorization & Rules
                    </h3>
                    <p className="text-sm text-slate-500 ml-8">Apply to new transactions from this merchant.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Category</Label>
                        <Select value={rule.category} onValueChange={(v) => setRule({ ...rule, category: v, sub_category: '' })}>
                            <SelectTrigger className="h-10 bg-white shadow-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                                {displayCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Sub-category</Label>
                        <Select
                            value={rule.sub_category}
                            onValueChange={(v) => setRule({ ...rule, sub_category: v })}
                            disabled={!rule.category}
                        >
                            <SelectTrigger className="h-10 bg-white shadow-sm"><SelectValue placeholder="..." /></SelectTrigger>
                            <SelectContent>
                                {(displaySubCategories[rule.category] || []).map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Recurring Frequency</Label>
                        <Select value={rule.auto_recurring} onValueChange={(v) => setRule({ ...rule, auto_recurring: v })}>
                            <SelectTrigger className="h-10 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {['N/A', 'Monthly', 'Annually', 'Bi-annually', 'Quarterly', 'Weekly', 'One-off'].map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Settings</Label>
                        <div className="flex items-center justify-between h-10 px-3 border rounded-md bg-white shadow-sm">
                            <Label htmlFor="rule-unplanned" className="text-sm font-medium text-slate-700 cursor-pointer">Unplanned</Label>
                            <Switch
                                id="rule-unplanned"
                                checked={!rule.auto_planned} // If planned=false, then Unplanned=true
                                onCheckedChange={(v) => setRule({ ...rule, auto_planned: !v })} // If Unplanned=true, set planned=false
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Automation Settings</p>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <Label className="text-sm font-medium text-slate-900 block mb-0.5">Auto-complete future imports</Label>
                            <span className="text-xs text-slate-500">New transactions will skip triage.</span>
                        </div>
                        <Switch
                            checked={autoCompleteFuture}
                            onCheckedChange={setAutoCompleteFuture}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4 opacity-100 transition-opacity">
                        <div className="flex-1">
                            <Label className="text-sm font-medium text-slate-900 block mb-0.5">
                                Update {selectedIds.size} similar transactions
                            </Label>
                            <span className="text-xs text-slate-500">Apply these settings to the history found in Step 1.</span>
                        </div>
                        <Switch
                            checked={applyToHistory}
                            onCheckedChange={setApplyToHistory}
                            disabled={selectedIds.size === 0}
                        />
                    </div>
                </div>

                <div className="flex gap-3 bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-800 text-xs mt-4">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Rule Behavior</p>
                        <p>This will be applied to all future transactions matching the merchant name. Existing transactions will only be updated if selected above.</p>
                    </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-slate-100 mt-2">
                    <Button variant="ghost" onClick={() => setStep(1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700 font-black px-6 shadow-lg shadow-emerald-100"
                        disabled={!rule.category || isSaving}
                        onClick={handleSave}
                    >
                        {isSaving ? "Saving..." : <><Check className="w-4 h-4 mr-2" /> Save Rule</>}
                    </Button>
                </div>
            </div>
        </div>
    );
};
