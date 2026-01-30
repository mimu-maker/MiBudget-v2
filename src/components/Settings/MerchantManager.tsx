import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { MerchantNameSelector } from '../Transactions/MerchantNameSelector';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Trash2, Zap, RefreshCw, Calendar, EyeOff, Save, Check, Store, Sparkles, ArrowRight, Info, AlertCircle, Pencil, X } from 'lucide-react';
import { cleanMerchant } from '@/lib/importBrain';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';

export const MerchantManager = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { settings } = useSettings();
    const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();
    const [search, setSearch] = useState('');
    const [scanResults, setScanResults] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);
    const [newRule, setNewRule] = useState({
        name: '',
        category: '',
        sub_category: '',
        auto_recurring: 'N/A',
        auto_planned: false,
        auto_exclude: false,
        skip_triage: false
    });
    const [matchingTransactions, setMatchingTransactions] = useState<any[]>([]);
    const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
    const [applySelectedIds, setApplySelectedIds] = useState<Set<string>>(new Set());
    const [expandedScanIndex, setExpandedScanIndex] = useState<number | null>(null);
    const [scanRule, setScanRule] = useState<any>(null);
    const [editingRule, setEditingRule] = useState<any | null>(null);

    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['merchant_rules'],
        queryFn: async () => {
            const { data } = await supabase.from('merchant_rules').select('*').order('clean_merchant_name');
            return data || [];
        }
    });

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions-for-scan'],
        queryFn: async () => {
            const { data, error } = await supabase.from('transactions').select('id, merchant, clean_merchant, status, date, amount, category, sub_category, recurring, planned, excluded');
            if (error) {
                console.error("Transactions Fetch Error:", error);
                return [];
            }
            return data || [];
        }
    });

    const addMutation = useMutation({
        mutationFn: async ({ rule, applyToIds }: { rule: any, applyToIds: string[] }) => {
            const payload: any = {
                user_id: user?.id,
                merchant_name: rule.raw_name,
                clean_merchant_name: rule.name,
                auto_category: rule.category,
                auto_sub_category: rule.sub_category,
                skip_triage: rule.skip_triage,
                auto_recurring: rule.auto_recurring,
                auto_planned: rule.auto_planned,
                auto_verify: rule.auto_verify
            };

            if (rule.auto_exclude) {
                payload.auto_budget = 'Exclude';
            }

            const { error: ruleError } = await supabase.from('merchant_rules').insert([payload]);
            if (ruleError) throw ruleError;

            if (applyToIds.length > 0) {
                // Fetch the current state of these transactions to check for null fields
                // This ensures we don't overwrite manual edits as requested
                const { data: currentTxs } = await supabase
                    .from('transactions')
                    .select('id, category, sub_category, recurring, planned, excluded')
                    .in('id', applyToIds);

                if (currentTxs) {
                    const updatePromises = currentTxs.map(tx => {
                        const updates: any = {
                            clean_merchant: rule.name
                        };

                        if (rule.skip_triage) {
                            updates.status = 'Complete';
                            // Only apply if existing field is null or empty as per user request
                            if (!tx.category || tx.category === 'Other') updates.category = rule.category;
                            if (!tx.sub_category) updates.sub_category = rule.sub_category;
                            if (!tx.recurring || tx.recurring === 'N/A') updates.recurring = rule.auto_recurring;
                            if (tx.planned === null || tx.planned === undefined) updates.planned = rule.auto_planned;
                            if (rule.auto_exclude && !tx.excluded) updates.excluded = true;
                        }

                        return supabase
                            .from('transactions')
                            .update(updates)
                            .eq('id', tx.id);
                    });

                    await Promise.all(updatePromises);
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['merchant_rules'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setScanResults([]);
            setMatchingTransactions([]);
            setApplySelectedIds(new Set());
            setIsApplyDialogOpen(false);
            setExpandedScanIndex(null);
        }
    });

    const editMutation = useMutation({
        mutationFn: async (rule: any) => {
            const { error } = await supabase
                .from('merchant_rules')
                .update({
                    clean_merchant_name: rule.clean_merchant_name,
                    auto_category: rule.auto_category,
                    auto_sub_category: rule.auto_sub_category,
                    auto_recurring: rule.auto_recurring,
                    auto_planned: rule.auto_planned,
                    auto_budget: rule.auto_budget,
                    skip_triage: rule.skip_triage,
                    auto_verify: rule.auto_verify
                })
                .eq('id', rule.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['merchant_rules'] });
            setEditingRule(null);
        }
    });



    const findMatches = (rule: any) => {
        // FIX: Search using the ORIGINAL grouping key (cleaned name) or raw name, NOT the new display name
        // The rule.raw_name is the "clean" name from the grouping phase if it came from the wizard
        const searchTarget = (rule.raw_name || rule.name).toLowerCase();

        const matches = transactions.filter(tx => {
            const txClean = cleanMerchant(tx.merchant).toLowerCase();
            const txRaw = (tx.merchant || '').toLowerCase();

            // Match against the cleaned version (how wizard matched it) or the raw input
            return txClean === searchTarget ||
                txClean.includes(searchTarget) ||
                txRaw.includes(searchTarget);
        });

        setMatchingTransactions(matches);
        setApplySelectedIds(new Set(matches.map(m => m.id)));
        if (matches.length > 0) {
            setIsApplyDialogOpen(true);
        } else {
            addMutation.mutate({ rule, applyToIds: [] });
        }
    };

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('merchant_rules').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchant_rules'] })
    });

    const handleScan = () => {
        setIsScanning(true);
        setHasScanned(false);
        console.log("Merchant Scan: Starting with", transactions.length, "total transactions");

        if (transactions.length === 0) {
            console.warn("Merchant Scan: No transactions found to scan.");
            setHasScanned(true);
            setIsScanning(false);
            return;
        }

        try {
            const existingRawNames = new Set(rules.map(r => r.merchant_name?.toLowerCase()));
            const merchantData: Record<string, any> = {};

            transactions.forEach(tx => {
                // User Request: Only show merchants with unresolved name (resolved name = null)
                if (tx.clean_merchant) return;

                const clean = cleanMerchant(tx.merchant);
                if (!clean || tx.status === 'Complete') return;

                if (!merchantData[clean]) {
                    merchantData[clean] = {
                        count: 0,
                        categories: {},
                        subs: {},
                        dates: [],
                        amounts: [], // Track amounts for ranking
                        planned_count: 0,
                        excluded_count: 0
                    };
                }
                const data = merchantData[clean];
                data.count++;
                if (tx.category) data.categories[tx.category] = (data.categories[tx.category] || 0) + 1;
                if (tx.sub_category) data.subs[tx.sub_category] = (data.subs[tx.sub_category] || 0) + 1;
                data.dates.push(tx.date);
                if (tx.amount) data.amounts.push(Math.abs(tx.amount));
                if (tx.planned) data.planned_count++;
                if (tx.excluded) data.excluded_count++;
            });

            const results = Object.entries(merchantData)
                .map(([name, data]) => {
                    const sortedCats = Object.entries(data.categories).sort((a: any, b: any) => b[1] - a[1]);
                    const bestCatEntry = sortedCats[0];
                    const bestCat = bestCatEntry?.[0] || 'Other';
                    const bestCatCount = (bestCatEntry?.[1] as number) || 0;

                    const bestSub = Object.entries(data.subs).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '';
                    const avgAmount = data.amounts.length > 0 ? (data.amounts.reduce((a: number, b: number) => a + b, 0) / data.amounts.length) : 0;

                    let recurring = 'One-off';
                    if (data.dates.length >= 2) {
                        const sortedDates = [...data.dates].sort();
                        const diffs = [];
                        for (let i = 1; i < sortedDates.length; i++) {
                            const d1 = new Date(sortedDates[i - 1]);
                            const d2 = new Date(sortedDates[i]);
                            diffs.push((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
                        }
                        const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
                        if (avgDiff >= 25 && avgDiff <= 35) recurring = 'Monthly';
                        else if (avgDiff >= 80 && avgDiff <= 100) recurring = 'Quarterly';
                        else if (avgDiff >= 6 && avgDiff <= 8) recurring = 'Weekly';
                    }

                    // Calculate Confidence Score (0.0 - 1.0)
                    // 1. Frequency: More transactions = higher confidence, but cap it.
                    //    We care about things that happen enough to be a rule (e.g. > 2 times).
                    const frequencyScore = Math.min(data.count / 4, 1.0);

                    // 2. Pattern: Recurring is the strongest signal.
                    //    Monthly is "Platinum" tier (salary, rent, subs). Weekly is good. One-off is weak.
                    let patternScore = 0.0;
                    if (recurring === 'Monthly') patternScore = 1.0;
                    else if (recurring === 'Weekly') patternScore = 0.8;
                    else if (recurring === 'Quarterly') patternScore = 0.8;
                    else if (data.count > 2) patternScore = 0.4; // Frequent but irregular

                    // 3. Amount: High value items (Salary, Rent) are critical to get right.
                    //    > 5000 = 1.0, > 1000 = 0.8, > 100 = 0.5
                    let amountScore = 0.2;
                    if (avgAmount > 5000) amountScore = 1.0;
                    else if (avgAmount > 1000) amountScore = 0.8;
                    else if (avgAmount > 100) amountScore = 0.5;

                    // 4. Consistency: Do we always categorize this similarly?
                    const consistencyScore = data.count > 0 ? (bestCatCount / data.count) : 0;

                    // Weighted Formula: 
                    // Pattern (recurrence) is King (40%)
                    // Amount is Queen (30%) - User explicit request: "Big amount... top of list"
                    // Frequency (20%)
                    // Consistency (10%)
                    const confidence = (patternScore * 0.4) + (amountScore * 0.3) + (frequencyScore * 0.2) + (consistencyScore * 0.1);

                    return {
                        name,
                        count: data.count,
                        category: bestCat,
                        sub: bestSub,
                        recurring,
                        planned: data.planned_count > data.count / 2,
                        excluded: data.excluded_count > data.count / 2,
                        confidence, // Add confidence to the result
                        avgAmount
                    };
                })
                .sort((a, b) => {
                    // Primary Sort: Confidence (High to Low)
                    if (Math.abs(b.confidence - a.confidence) > 0.05) return b.confidence - a.confidence;
                    // Secondary Sort: Amount (High to Low) - Important for "Big items first"
                    return b.avgAmount - a.avgAmount;
                })
                .slice(0, 20);

            console.log("Merchant Scan: Found", results.length, "suggestions");
            setScanResults(results);
            setHasScanned(true);
        } catch (err) {
            console.error("Merchant Scan Error:", err);
        } finally {
            setIsScanning(false);
        }
    };

    const filteredRules = rules.filter(r =>
        r.clean_merchant_name.toLowerCase().includes(search.toLowerCase()) ||
        r.auto_category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="p-6 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Merchant Management</h3>
                        <p className="text-xs text-slate-500">
                            Define automatic categorization.
                            <span className="ml-2 font-mono bg-slate-100 px-1 rounded text-[10px]">
                                {transactions.length} total tx / {rules.length} rules
                                {scanResults.length > 0 && ` / ${scanResults.length} suggestions`}
                            </span>
                        </p>
                    </div>
                    {/* Only show Scan button when results are NOT visible */}
                    {scanResults.length === 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50 gap-2"
                            onClick={handleScan}
                            disabled={isScanning || transactions.length === 0}
                        >
                            <Zap className={isScanning ? "w-4 h-4 animate-pulse text-amber-500" : "w-4 h-4 text-amber-500"} />
                            {isScanning ? "Scanning..." : "Scan for Merchants"}
                        </Button>
                    )}
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search rules..."
                        className="pl-9 bg-white h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Scan Results Section */}
            {(scanResults.length > 0 || (hasScanned && !isScanning)) && (
                <div className="p-6 bg-blue-50/30 border-b animate-in slide-in-from-top duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <Label className="text-sm font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            {scanResults.length > 0 ? "Suggested Merchant Rules" : "Scan Complete"}
                        </Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setScanResults([]); setHasScanned(false); }}
                            className="text-slate-600 hover:text-slate-800 h-8 gap-2 bg-white/50 border-blue-200 hover:bg-white"
                        >
                            <X className="w-4 h-4" />
                            Close Suggestions
                        </Button>
                    </div>
                    {scanResults.length === 0 && (
                        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                            <Label className="text-slate-400 italic">No new merchant patterns found in your {transactions.length} transactions.</Label>
                        </div>
                    )}
                    <div className="space-y-4">
                        {scanResults.map((res, i) => {
                            const isExpanded = expandedScanIndex === i;
                            return (
                                <div key={i} className="space-y-3">
                                    <div
                                        className={cn(
                                            "bg-white p-3 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between group hover:border-blue-400 hover:shadow-md transition-all cursor-pointer",
                                            isExpanded && "ring-2 ring-blue-500 ring-offset-2 border-blue-400"
                                        )}
                                        onClick={() => {
                                            if (isExpanded) {
                                                setExpandedScanIndex(null);
                                                setScanRule(null);
                                            } else {
                                                setExpandedScanIndex(i);
                                                // Pre-select all matching transactions
                                                const matches = transactions.filter(t => cleanMerchant(t.merchant) === res.name);
                                                setApplySelectedIds(new Set(matches.map(m => m.id)));

                                                setScanRule({
                                                    raw_name: res.name, // The name found by scan is the raw candidate
                                                    name: res.name,
                                                    category: res.category,
                                                    sub_category: res.sub || '',
                                                    auto_recurring: res.recurring || 'N/A',
                                                    auto_planned: res.planned || false,
                                                    auto_exclude: res.excluded || false,
                                                    auto_verify: true,
                                                    skip_triage: true
                                                });
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                                                <Store className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-800 text-base truncate">{res.name}</span>
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] py-0 h-4">{res.count} items</Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 font-medium whitespace-nowrap overflow-hidden">
                                                    <span className="flex items-center gap-1"><Badge variant="outline" className="border-slate-200 text-slate-600 font-bold px-1.5 py-0 rounded">{res.category}</Badge></span>
                                                    {res.recurring !== 'One-off' && <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {res.recurring}</span>}
                                                    {res.planned && <span className="flex items-center gap-1 text-indigo-600"><Calendar className="w-3 h-3" /> Unplanned</span>}
                                                    {res.excluded && <span className="flex items-center gap-1 text-rose-600"><EyeOff className="w-3 h-3" /> Excluded</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 shrink-0 ml-4">
                                            <div className="flex gap-1.5">
                                                <div className={`w-1.5 h-6 rounded-full ${res.category ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                                                <div className={`w-1.5 h-6 rounded-full ${res.recurring !== 'One-off' ? 'bg-emerald-400' : 'bg-slate-200 opacity-30'}`} />
                                                <div className={`w-1.5 h-6 rounded-full ${res.planned ? 'bg-emerald-400' : 'bg-slate-200 opacity-30'}`} />
                                            </div>
                                            <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase">
                                                {isExpanded ? 'Cancel' : 'Configure'} <Plus className={cn("w-4 h-4 ml-1 transition-transform", isExpanded && "rotate-45")} />
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && scanRule && (
                                        <div className="bg-white p-6 rounded-xl border-2 border-blue-100 shadow-xl animate-in slide-in-from-top-2 duration-300">
                                            <Tabs defaultValue="settings" className="w-full">
                                                <div className="flex items-center justify-between mb-4">
                                                    <TabsList className="grid w-[300px] grid-cols-2">
                                                        <TabsTrigger value="settings">Rule Settings</TabsTrigger>
                                                        <TabsTrigger value="history">History ({transactions.filter(t => cleanMerchant(t.merchant) === scanRule.raw_name).length})</TabsTrigger>
                                                    </TabsList>
                                                </div>

                                                <TabsContent value="settings" className="mt-0">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] uppercase font-bold text-slate-500">Input Name (From Bank)</Label>
                                                                <p className="text-sm font-mono text-slate-700">{scanRule.raw_name}</p>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] uppercase font-bold text-slate-500">Display Name (Pill Name)</Label>
                                                                <MerchantNameSelector
                                                                    value={scanRule.name}
                                                                    onChange={(v) => setScanRule({ ...scanRule, name: v })}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Category</Label>
                                                                    <Select value={scanRule.category} onValueChange={(v) => setScanRule({ ...scanRule, category: v, sub_category: '' })}>
                                                                        <SelectTrigger className="h-10 bg-white shadow-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {displayCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Sub-category</Label>
                                                                    <Select
                                                                        value={scanRule.sub_category}
                                                                        onValueChange={(v) => setScanRule({ ...scanRule, sub_category: v })}
                                                                        disabled={!scanRule.category}
                                                                    >
                                                                        <SelectTrigger className="h-10 bg-white shadow-sm"><SelectValue placeholder="..." /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {(displaySubCategories[scanRule.category] || []).map(s => (
                                                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Recurring</Label>
                                                                    <Select value={scanRule.auto_recurring} onValueChange={(v) => setScanRule({ ...scanRule, auto_recurring: v })}>
                                                                        <SelectTrigger className="h-10 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {['N/A', 'Monthly', 'Annually', 'Bi-annually', 'Quarterly', 'Weekly', 'One-off'].map(opt => (
                                                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="flex flex-col justify-end pb-1">
                                                                    <div className="flex items-center space-x-2 h-9">
                                                                        <Switch
                                                                            id={`scan-planned-${i}`}
                                                                            checked={scanRule.auto_planned}
                                                                            onCheckedChange={(v) => setScanRule({ ...scanRule, auto_planned: v })}
                                                                        />
                                                                        <Label htmlFor={`scan-planned-${i}`} className="text-xs font-bold text-slate-600">Always Planned</Label>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="flex items-center space-x-2 h-9">
                                                                    <Switch
                                                                        id={`scan-exclude-${i}`}
                                                                        checked={scanRule.auto_exclude}
                                                                        onCheckedChange={(v) => setScanRule({ ...scanRule, auto_exclude: v })}
                                                                    />
                                                                    <Label htmlFor={`scan-exclude-${i}`} className="text-xs font-bold text-rose-600">Exclude</Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2 h-9">
                                                                    <Switch
                                                                        id={`scan-skip-${i}`}
                                                                        checked={scanRule.skip_triage}
                                                                        onCheckedChange={(v) => setScanRule({ ...scanRule, skip_triage: v })}
                                                                    />
                                                                    <Label htmlFor={`scan-skip-${i}`} className="text-xs font-bold text-emerald-600">Auto-Complete</Label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="history" className="mt-0">
                                                    <div className="max-h-[300px] overflow-y-auto border rounded-lg bg-white">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-slate-50 sticky top-0 border-b z-10">
                                                                <tr className="text-[10px] uppercase font-black text-slate-400">
                                                                    <th className="py-2 px-4 w-10 text-center">
                                                                        <Checkbox
                                                                            checked={
                                                                                transactions.filter(t => cleanMerchant(t.merchant) === scanRule.raw_name).length > 0 &&
                                                                                transactions.filter(t => cleanMerchant(t.merchant) === scanRule.raw_name)
                                                                                    .every(t => applySelectedIds.has(t.id))
                                                                            }
                                                                            onCheckedChange={(checked) => {
                                                                                const matches = transactions.filter(t => cleanMerchant(t.merchant) === scanRule.raw_name);
                                                                                if (checked) {
                                                                                    setApplySelectedIds(new Set([...applySelectedIds, ...matches.map(m => m.id)]));
                                                                                } else {
                                                                                    const next = new Set(applySelectedIds);
                                                                                    matches.forEach(m => next.delete(m.id));
                                                                                    setApplySelectedIds(next);
                                                                                }
                                                                            }}
                                                                        />
                                                                    </th>
                                                                    <th className="py-2 px-4 text-left">Date</th>
                                                                    <th className="py-2 px-4 text-left">Merchant (Raw)</th>
                                                                    <th className="py-2 px-4 text-left">Category</th>
                                                                    <th className="py-2 px-4 text-right">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {transactions
                                                                    .filter(t => cleanMerchant(t.merchant) === scanRule.raw_name)
                                                                    .slice(0, 50) // Limit to 50 for performance in wizard
                                                                    .map((tx) => (
                                                                        <tr key={tx.id} className="hover:bg-slate-50">
                                                                            <td className="py-2 px-4 text-center">
                                                                                <Checkbox
                                                                                    checked={applySelectedIds.has(tx.id)}
                                                                                    onCheckedChange={(checked) => {
                                                                                        const next = new Set(applySelectedIds);
                                                                                        if (checked) next.add(tx.id);
                                                                                        else next.delete(tx.id);
                                                                                        setApplySelectedIds(next);
                                                                                    }}
                                                                                />
                                                                            </td>
                                                                            <td className="py-2 px-4 font-mono text-xs text-slate-500">{tx.date}</td>
                                                                            <td className="py-2 px-4 font-medium text-slate-700 truncate max-w-[200px]" title={tx.merchant}>{tx.merchant}</td>
                                                                            <td className="py-2 px-4 text-xs">
                                                                                {tx.category ? (
                                                                                    <Badge variant="outline" className="font-normal">{tx.category}</Badge>
                                                                                ) : (
                                                                                    <span className="text-slate-300 italic">Uncategorized</span>
                                                                                )}
                                                                            </td>
                                                                            <td className={cn("py-2 px-4 text-right font-bold", tx.amount < 0 ? "text-slate-800" : "text-emerald-600")}>
                                                                                {formatCurrency(tx.amount, settings.currency)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </TabsContent>
                                            </Tabs>

                                            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                                                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                                    <Info className="w-4 h-4" />
                                                    <span className="text-[11px] font-bold">This rule will automate future imports of "{scanRule.raw_name}"</span>
                                                </div>
                                                <div className="flex gap-3 w-full md:w-auto">
                                                    <Button variant="ghost" onClick={() => setExpandedScanIndex(null)} className="flex-1 md:flex-none">Cancel</Button>
                                                    <Button
                                                        className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 px-8 font-black shadow-lg shadow-blue-100"
                                                        onClick={() => addMutation.mutate({ rule: scanRule, applyToIds: Array.from(applySelectedIds) })}
                                                        disabled={!scanRule.name || !scanRule.category || addMutation.isPending}
                                                    >
                                                        <Check className="w-4 h-4 mr-2" />
                                                        {applySelectedIds.size > 0
                                                            ? `Save & Apply to ${applySelectedIds.size}`
                                                            : "Confirm & Save Rule"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}



            {/* Apply Rule Dialog */}
            <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-600" />
                            Apply Rule to Existing History?
                        </DialogTitle>
                        <DialogDescription>
                            We found {matchingTransactions.length} transactions that match this rule. Select which ones to update now.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0 border-b">
                                <tr className="text-[10px] uppercase font-black text-slate-400">
                                    <th className="py-3 px-4 text-center w-10">
                                        <Checkbox
                                            checked={applySelectedIds.size === matchingTransactions.length}
                                            onCheckedChange={(checked) => {
                                                if (checked) setApplySelectedIds(new Set(matchingTransactions.map(m => m.id)));
                                                else setApplySelectedIds(new Set());
                                            }}
                                        />
                                    </th>
                                    <th className="py-3 px-2 text-left">Date</th>
                                    <th className="py-3 px-2 text-left">Original Merchant</th>
                                    <th className="py-3 px-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {matchingTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-4 text-center">
                                            <Checkbox
                                                checked={applySelectedIds.has(tx.id)}
                                                onCheckedChange={(checked) => {
                                                    const next = new Set(applySelectedIds);
                                                    if (checked) next.add(tx.id);
                                                    else next.delete(tx.id);
                                                    setApplySelectedIds(next);
                                                }}
                                            />
                                        </td>
                                        <td className="py-2 px-2 text-slate-500 font-mono text-[11px]">{tx.date}</td>
                                        <td className="py-2 px-2 font-medium text-slate-700">{tx.merchant}</td>
                                        <td className={cn("py-2 px-2 text-right font-bold", tx.amount < 0 ? "text-slate-800" : "text-emerald-600")}>
                                            {formatCurrency(tx.amount, settings.currency)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => addMutation.mutate({ rule: scanRule, applyToIds: [] })}>
                            Only New Imports
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 font-bold px-6"
                            onClick={() => addMutation.mutate({ rule: scanRule, applyToIds: Array.from(applySelectedIds) })}
                            disabled={addMutation.isPending}
                        >
                            {addMutation.isPending ? "Processing..." : `Apply to ${applySelectedIds.size} selected`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-[0.1em]">
                            <th className="py-4 px-6">Merchant Pattern</th>
                            <th className="py-4 px-6">Auto-Category</th>
                            <th className="py-4 px-6 text-center">Config</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRules.map((rule) => (
                            <tr key={rule.id} className="hover:bg-slate-50/80 group transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 gap-1.5 py-1 px-3 rounded-full inline-flex items-center w-fit font-bold shadow-sm">
                                            <Store className="w-3 h-3" />
                                            {rule.clean_merchant_name}
                                            <span className="text-[10px] opacity-50 font-normal ml-2">({rule.merchant_name || 'No raw pattern'})</span>
                                        </Badge>
                                        {rule.skip_triage && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] h-4">Auto</Badge>}
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700">{rule.auto_category}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{rule.auto_sub_category || 'No sub-category'}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center justify-center gap-4">
                                        {rule.auto_recurring && rule.auto_recurring !== 'N/A' && (
                                            <div className="flex flex-col items-center gap-0.5" title={`Recurring: ${rule.auto_recurring}`}>
                                                <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-[8px] font-bold text-blue-500 uppercase">{rule.auto_recurring.slice(0, 3)}</span>
                                            </div>
                                        )}
                                        {rule.auto_planned && (
                                            <div className="flex flex-col items-center gap-0.5" title="Always Unplanned">
                                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className="text-[8px] font-bold text-indigo-500 uppercase">Unplanned</span>
                                            </div>
                                        )}
                                        {rule.auto_budget === 'Exclude' && (
                                            <div className="flex flex-col items-center gap-0.5" title="Excluded">
                                                <EyeOff className="w-3.5 h-3.5 text-rose-500" />
                                                <span className="text-[8px] font-bold text-rose-500 uppercase">Excl</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={() => setEditingRule({ ...rule })}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={() => deleteMutation.mutate(rule.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredRules.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                                    No merchant rules found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Rule Dialog */}
            <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-blue-600" />
                            Edit Merchant Rule
                        </DialogTitle>
                        <DialogDescription>
                            Update the categorization and behavior for this merchant.
                        </DialogDescription>
                    </DialogHeader>

                    {editingRule && (
                        <div className="space-y-6 py-4">
                            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Input Pattern (Bank Name)</Label>
                                    <p className="text-sm font-mono text-slate-700">{editingRule.merchant_name}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Display Name</Label>
                                    <MerchantNameSelector
                                        value={editingRule.clean_merchant_name}
                                        onChange={(v) => setEditingRule({ ...editingRule, clean_merchant_name: v })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-slate-500">Category</Label>
                                    <Select
                                        value={editingRule.auto_category}
                                        onValueChange={(v) => setEditingRule({ ...editingRule, auto_category: v, auto_sub_category: '' })}
                                    >
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {displayCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-slate-500">Sub-category</Label>
                                    <Select
                                        value={editingRule.auto_sub_category}
                                        onValueChange={(v) => setEditingRule({ ...editingRule, auto_sub_category: v })}
                                        disabled={!editingRule.auto_category}
                                    >
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {(displaySubCategories[editingRule.auto_category] || []).map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-slate-500">Recurring</Label>
                                    <Select
                                        value={editingRule.auto_recurring}
                                        onValueChange={(v) => setEditingRule({ ...editingRule, auto_recurring: v })}
                                    >
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['N/A', 'Monthly', 'Annually', 'Bi-annually', 'Quarterly', 'Weekly', 'One-off'].map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col justify-end space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-600">Always Unplanned</Label>
                                        <Switch
                                            checked={editingRule.auto_planned}
                                            onCheckedChange={(v) => setEditingRule({ ...editingRule, auto_planned: v })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setEditingRule(null)}>Cancel</Button>
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700 font-bold px-8"
                                    onClick={() => editMutation.mutate(editingRule)}
                                    disabled={editMutation.isPending}
                                >
                                    {editMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
};
