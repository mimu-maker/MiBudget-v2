
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { SourceNameSelector } from '../Transactions/SourceNameSelector';
import { SourceMappingRefiner } from '../Transactions/SourceMappingRefiner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Trash2, Zap, RefreshCw, Calendar, EyeOff, Save, Check, Store, Sparkles, ArrowRight, Info, AlertCircle, Pencil, X, List, Target, History as HistoryIcon, ChevronDown } from 'lucide-react';
import { cleanSource } from '@/lib/importBrain';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { TransactionDetailDialog } from '../Transactions/TransactionDetailDialog';
import { Transaction } from '../Transactions/hooks/useTransactionTable';
import { useToast } from '@/hooks/use-toast';

export const SourceManager = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();
    const { settings } = useSettings();
    const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();
    const [search, setSearch] = useState('');
    const [scanResults, setScanResults] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);
    const [matchingTransactions, setMatchingTransactions] = useState<any[]>([]);
    const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
    const [applySelectedIds, setApplySelectedIds] = useState<Set<string>>(new Set());
    const [expandedScanIndex, setExpandedScanIndex] = useState<number | null>(null);
    const [scanRule, setScanRule] = useState<any>(null);
    const [editingRule, setEditingRule] = useState<any | null>(null);
    const [refiningSource, setRefiningSource] = useState<string | null>(null);
    const [historyRule, setHistoryRule] = useState<any | null>(null);
    const [selectedTransactionForEdit, setSelectedTransactionForEdit] = useState<Transaction | null>(null);
    const [filterAuto, setFilterAuto] = useState(false);
    const [filterExcluded, setFilterExcluded] = useState(false);
    const [filterRecurring, setFilterRecurring] = useState(false);
    const [sortBy, setSortBy] = useState<'name' | 'popularity' | 'spend'>('name');

    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['source_rules'],
        queryFn: async () => {
            // Fetch both new source_rules and legacy merchant_rules in parallel
            const [sourceRes, merchantRes] = await Promise.allSettled([
                (supabase as any).from('source_rules').select('*').order('clean_source_name'),
                (supabase as any).from('merchant_rules').select('*').order('clean_merchant_name')
            ]);

            const rules = [];

            // Process source_rules (New)
            if (sourceRes.status === 'fulfilled' && sourceRes.value.data) {
                rules.push(...sourceRes.value.data.map((r: any) => ({
                    ...r,
                    // Ensure unified field names for the UI
                    source_name: r.source_name || r.merchant_name, // Fallback if schema varies
                    clean_source_name: r.clean_source_name || r.clean_merchant_name
                })));
            } else if (sourceRes.status === 'rejected') {
                console.warn("Failed to fetch source_rules:", sourceRes.reason);
            }

            // Process merchant_rules (Legacy)
            if (merchantRes.status === 'fulfilled' && merchantRes.value.data) {
                rules.push(...merchantRes.value.data.map((r: any) => ({
                    ...r,
                    // Map legacy fields to new schema, handling potential column name variations
                    source_name: r.merchant || r.merchant_name,
                    clean_source_name: r.clean_merchant_name || r.name,
                    id: r.id // Keep original ID for updates if needed (though updates might need care)
                })));
            } else if (merchantRes.status === 'rejected') {
                console.warn("Failed to fetch merchant_rules:", merchantRes.reason);
            }

            // Combine both lists without deduplication (we want to see ALL patterns)
            return [...rules];
        }
    });

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions'],
        queryFn: async () => {
            const { data, error } = await supabase.from('transactions').select('*');
            if (error) {
                console.error("Transactions Fetch Error:", error);
                return [];
            }

            // Map legacy 'merchant' fields to 'source' fields for consistent UI logic
            return (data || []).map((t: any) => ({
                ...t,
                source: t.source || t.merchant || 'Unknown',
                clean_source: t.clean_source || t.clean_merchant || null,
                source_description: t.source_description || t.merchant_description || null
            }));
        }
    });

    const addMutation = useMutation({
        mutationFn: async ({ rule, applyToIds }: { rule: any, applyToIds: string[] }) => {
            const sourceRuleData = {
                user_id: user?.id,
                source_name: rule.raw_name,
                clean_source_name: rule.name,
                auto_category: rule.category,
                auto_sub_category: rule.sub_category,
                skip_triage: rule.skip_triage,
                auto_recurring: rule.auto_recurring,
                auto_planned: rule.auto_planned,
                match_mode: rule.match_mode || 'fuzzy',
                auto_budget: rule.auto_exclude ? 'Exclude' : 'Budgeted'
            };

            let { error: ruleError } = await (supabase as any)
                .from('source_rules')
                .upsert([sourceRuleData], { onConflict: 'user_id, source_name' });

            if (ruleError && (ruleError.code === '42P01' || ruleError.code === 'PGRST205' || ruleError.code === 'PGRST204' || ruleError.message?.includes('not found') || ruleError.message?.includes('column'))) {
                const fallbackPayload = {
                    user_id: user?.id,
                    merchant_name: rule.raw_name,
                    clean_merchant_name: rule.name,
                    auto_category: rule.category,
                    auto_sub_category: rule.sub_category,
                    skip_triage: rule.skip_triage,
                    auto_recurring: rule.auto_recurring,
                    auto_planned: rule.auto_planned,
                    match_mode: rule.match_mode || 'fuzzy',
                    auto_budget: rule.auto_exclude ? 'Exclude' : 'Budgeted'
                };

                const { error: fallbackError } = await (supabase as any)
                    .from('merchant_rules')
                    .upsert([fallbackPayload], { onConflict: 'user_id, merchant_name' });
                ruleError = fallbackError;
            }

            if (ruleError) throw ruleError;

            if (applyToIds.length > 0) {
                const { data: currentTxs } = await (supabase as any)
                    .from('transactions')
                    .select('id, category, sub_category, recurring, planned, excluded')
                    .in('id', applyToIds);

                if (currentTxs) {
                    const updatePromises = currentTxs.map(tx => {
                        const updates: any = {
                            clean_source: rule.name,
                            clean_merchant: rule.name
                        };

                        if (rule.skip_triage) {
                            updates.status = 'Complete';
                            if (!tx.category || tx.category === 'Other') updates.category = rule.category;
                            if (!tx.sub_category) updates.sub_category = rule.sub_category;
                            if (!tx.recurring || tx.recurring === 'N/A') updates.recurring = rule.auto_recurring;
                            if (tx.planned === null || tx.planned === undefined) updates.planned = rule.auto_planned;
                            if (rule.auto_exclude && !tx.excluded) updates.excluded = true;
                        }

                        return (supabase as any)
                            .from('transactions')
                            .update(updates)
                            .eq('id', tx.id);
                    });

                    await Promise.all(updatePromises);
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['source_rules'] });
            queryClient.invalidateQueries({ queryKey: ['merchant_rules'] });
            queryClient.invalidateQueries({ queryKey: ['existing-source-names'] });
            queryClient.invalidateQueries({ queryKey: ['existing-source-names-ranked'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast({ title: "Rule Created", description: "Source rule created and applied successfully." });
            setScanResults([]);
            setMatchingTransactions([]);
            setApplySelectedIds(new Set());
            setIsApplyDialogOpen(false);
            setExpandedScanIndex(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const editMutation = useMutation({
        mutationFn: async (rule: any) => {
            const updates: any = {
                // New schema
                clean_source_name: rule.clean_source_name,
                // Old schema
                clean_merchant_name: rule.clean_source_name || rule.clean_merchant_name,

                auto_category: rule.auto_category,
                auto_sub_category: rule.auto_sub_category,
                auto_recurring: rule.auto_recurring,
                auto_planned: rule.auto_planned,
                auto_budget: rule.auto_budget,
                skip_triage: rule.skip_triage,
                match_mode: rule.match_mode || 'fuzzy'
            };

            let { error } = await (supabase as any)
                .from('source_rules')
                .update(updates)
                .eq('id', rule.id);

            if (error && (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('not found'))) {
                const { clean_source_name, ...fallbackUpdates } = updates;
                error = (await (supabase as any)
                    .from('merchant_rules')
                    .update(fallbackUpdates)
                    .eq('id', rule.id)).error;
            }

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['source_rules'] });
            toast({ title: "Rule Updated", description: "The source rule has been updated successfully." });
            setEditingRule(null);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const handleUpdateTransaction = async (updates: Partial<Transaction>) => {
        if (!selectedTransactionForEdit) return;

        const { error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', selectedTransactionForEdit.id);

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['source_rules'] });
        queryClient.invalidateQueries({ queryKey: ['transactions-for-scan'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        setSelectedTransactionForEdit(null);
    };

    const findMatches = (rule: any) => {
        const searchTarget = (rule.raw_name || rule.name).toLowerCase();

        const matches = transactions.filter(tx => {
            const txClean = cleanSource(tx.source, settings.noiseFilters).toLowerCase();
            const txRaw = (tx.source || '').toLowerCase();

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

    const handleSaveSourceMapping = async (cleanName: string, pattern: string, selectedIds: string[]) => {
        try {
            // 1. Create the rule
            const payload: any = {
                user_id: user?.id,
                source_name: pattern,
                clean_source_name: cleanName,
                match_mode: 'fuzzy',
                skip_triage: true,
                auto_category: 'Other' // Default, user can edit later
            };

            let { error: ruleError } = await (supabase as any).from('source_rules').insert([payload]);

            if (ruleError && (ruleError.code === '42P01' || ruleError.code === 'PGRST205' || ruleError.message?.includes('not found'))) {
                const { source_name, clean_source_name, ...fallbackPayload } = payload;
                const { error: fallbackError } = await (supabase as any)
                    .from('merchant_rules')
                    .insert([{
                        ...fallbackPayload,
                        merchant_name: pattern,
                        clean_merchant_name: cleanName
                    }]);
                ruleError = fallbackError;
            }

            if (ruleError) throw ruleError;

            // 2. Apply to selected transactions
            if (selectedIds.length > 0) {
                const { error: updateError } = await supabase
                    .from('transactions')
                    .update({
                        clean_source: cleanName,
                        status: 'Pending Triage',
                        confidence: 1,
                    })
                    .in('id', selectedIds);

                if (updateError) throw updateError;
            }

            toast({
                title: "Mapping Saved",
                description: `Created rule for "${pattern}" and updated ${selectedIds.length} transactions.`,
            });

            queryClient.invalidateQueries({ queryKey: ['source_rules'] });
            queryClient.invalidateQueries({ queryKey: ['transactions-for-scan'] });
            setRefiningSource(null);
        } catch (err: any) {
            toast({
                title: "Error saving mapping",
                description: err.message,
                variant: "destructive"
            });
        }
    };

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            let { error } = await (supabase as any).from('source_rules').delete().eq('id', id);

            if (error && (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('not found'))) {
                error = (await (supabase as any).from('merchant_rules').delete().eq('id', id)).error;
            }

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['source_rules'] });
            toast({ title: "Rule Deleted", description: "The source rule has been removed." });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const handleScan = () => {
        setIsScanning(true);
        setHasScanned(false);

        if (transactions.length === 0) {
            setHasScanned(true);
            setIsScanning(false);
            return;
        }

        try {
            const sourceData: Record<string, any> = {};

            transactions.forEach(tx => {
                if (tx.clean_source) return;

                const rawClean = cleanSource(tx.source, settings.noiseFilters);
                if (!rawClean || tx.status === 'Complete') return;

                const clean = rawClean.toLowerCase();

                if (!sourceData[clean]) {
                    sourceData[clean] = {
                        displayName: rawClean,
                        count: 0,
                        categories: {},
                        subs: {},
                        dates: [],
                        amounts: [],
                        planned_count: 0,
                        excluded_count: 0
                    };
                }
                const data = sourceData[clean];
                data.count++;
                if (tx.category) data.categories[tx.category] = (data.categories[tx.category] || 0) + 1;
                if (tx.sub_category) data.subs[tx.sub_category] = (data.subs[tx.sub_category] || 0) + 1;
                data.dates.push(tx.date);
                if (tx.amount) data.amounts.push(Math.abs(tx.amount));
                if (tx.planned) data.planned_count++;
                if (tx.excluded) data.excluded_count++;
            });

            const results = Object.entries(sourceData)
                .map(([key, data]) => {
                    const name = data.displayName;
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

                    const frequencyScore = Math.min(data.count / 4, 1.0);
                    let patternScore = 0.0;
                    if (recurring === 'Monthly') patternScore = 1.0;
                    else if (recurring === 'Weekly') patternScore = 0.8;
                    else if (recurring === 'Quarterly') patternScore = 0.8;
                    else if (data.count > 2) patternScore = 0.4;

                    let amountScore = 0.2;
                    if (avgAmount > 5000) amountScore = 1.0;
                    else if (avgAmount > 1000) amountScore = 0.8;
                    else if (avgAmount > 100) amountScore = 0.5;

                    const consistencyScore = data.count > 0 ? (bestCatCount / data.count) : 0;
                    const confidence = (patternScore * 0.4) + (amountScore * 0.3) + (frequencyScore * 0.2) + (consistencyScore * 0.1);

                    return {
                        name,
                        count: data.count,
                        category: bestCat,
                        sub: bestSub,
                        recurring,
                        planned: data.planned_count > data.count / 2,
                        excluded: data.excluded_count > data.count / 2,
                        confidence,
                        avgAmount
                    };
                })
                .sort((a, b) => {
                    if (Math.abs(b.confidence - a.confidence) > 0.05) return b.confidence - a.confidence;
                    return b.avgAmount - a.avgAmount;
                })
                .slice(0, 20);

            setScanResults(results);
            setHasScanned(true);
        } catch (err) {
            console.error("Source Scan Error:", err);
        } finally {
            setIsScanning(false);
        }
    };

    const groupedRules = useMemo(() => {
        // Step 1: Pre-calculate metrics by matching transactions to rule groups
        const metrics: Record<string, { count: number, spend: number, displayName: string }> = {};

        // We create a temporary map of rules for faster lookup
        const ruleMatchMap = rules.map(r => ({
            ...r,
            rawLower: (r.source_name || '').toLowerCase(),
            cleanLowerRule: (r.clean_source_name || '').toLowerCase()
        }));

        transactions.forEach(tx => {
            let matchedGroupName: string | null = tx.clean_source;

            if (!matchedGroupName) {
                const txSourceLower = (tx.source || '').toLowerCase();
                // Semi-cleaned version for better pattern matching
                const txCleanedRawLower = cleanSource(tx.source || '', settings.noiseFilters).toLowerCase();

                const matchingRule = ruleMatchMap.find(r => {
                    if (!r.rawLower) return false;

                    // 1. Exact match on raw source
                    if (txSourceLower === r.rawLower) return true;

                    // 2. Exact match on rule pattern vs semi-cleaned transaction source
                    if (txCleanedRawLower === r.rawLower) return true;

                    // 3. Fuzzy match if enabled
                    if (r.match_mode !== 'exact') {
                        return txSourceLower.includes(r.rawLower) || r.rawLower.includes(txCleanedRawLower);
                    }
                    return false;
                });

                if (matchingRule) {
                    matchedGroupName = matchingRule.clean_source_name;
                } else {
                    // Fallback to auto-cleaned name if no rule matches
                    matchedGroupName = cleanSource(tx.source || '', settings.noiseFilters);
                }
            }

            if (matchedGroupName) {
                const key = matchedGroupName.toLowerCase();
                if (!metrics[key]) {
                    metrics[key] = { count: 0, spend: 0, displayName: matchedGroupName };
                }
                metrics[key].count++;
                metrics[key].spend += Math.abs(tx.amount || 0);
            }
        });

        // Step 2: Group the rules themselves
        const groups: Record<string, any[]> = {};
        rules.forEach(rule => {
            const name = rule.clean_source_name || 'Unresolved';
            const key = name.toLowerCase();
            if (!groups[key]) groups[key] = [];
            groups[key].push(rule);
        });

        // Step 3: Build the final group objects
        return Object.entries(groups)
            .map(([key, groupRules]) => {
                const name = groupRules[0].clean_source_name || metrics[key]?.displayName || 'Unresolved';

                // Group-level aggregate settings
                const categories: Record<string, number> = {};
                const subs: Record<string, number> = {};
                groupRules.forEach(r => {
                    if (r.auto_category) categories[r.auto_category] = (categories[r.auto_category] || 0) + 1;
                    if (r.auto_sub_category) subs[r.auto_sub_category] = (subs[r.auto_sub_category] || 0) + 1;
                });

                const bestCat = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other';
                const bestSub = Object.entries(subs).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
                const groupMetrics = metrics[key] || { count: 0, spend: 0, displayName: name };

                return {
                    name,
                    rules: groupRules.sort((a, b) => (a.source_name || '').localeCompare(b.source_name || '')),
                    category: bestCat,
                    sub_category: bestSub,
                    hasAuto: groupRules.some(r => r.skip_triage),
                    hasRecurring: groupRules.some(r => r.auto_recurring && r.auto_recurring !== 'N/A'),
                    hasExcluded: groupRules.some(r => r.auto_budget === 'Exclude'),
                    transactionCount: groupMetrics.count,
                    totalSpend: groupMetrics.spend
                };
            })
            .filter(group => {
                const matchesSearch = group.name.toLowerCase().includes(search.toLowerCase()) ||
                    group.rules.some(r => (r.source_name || '').toLowerCase().includes(search.toLowerCase())) ||
                    group.category.toLowerCase().includes(search.toLowerCase());

                if (!matchesSearch) return false;
                if (filterAuto && !group.hasAuto) return false;
                if (filterExcluded && !group.hasExcluded) return false;
                if (filterRecurring && !group.hasRecurring) return false;

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'popularity') return b.transactionCount - a.transactionCount;
                if (sortBy === 'spend') return b.totalSpend - a.totalSpend;
                return a.name.localeCompare(b.name);
            });
    }, [rules, transactions, search, filterAuto, filterExcluded, filterRecurring, sortBy, settings.noiseFilters]);

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (name: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    return (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="p-6 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Source Management</h3>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-white border border-slate-200 p-0.5 rounded-lg">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSortBy('name')}
                            className={cn("h-8 text-[10px] font-bold px-3 transition-all", sortBy === 'name' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")}
                        >
                            A-Z
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSortBy('popularity')}
                            className={cn("h-8 text-[10px] font-bold px-3 transition-all", sortBy === 'popularity' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")}
                        >
                            POPULARITY
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSortBy('spend')}
                            className={cn("h-8 text-[10px] font-bold px-3 transition-all", sortBy === 'spend' ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600")}
                        >
                            SPEND
                        </Button>
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
            </div>

            <div className="px-6 py-3 bg-white border-b flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Filters:</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterAuto(!filterAuto)}
                    className={cn(
                        "h-7 px-3 rounded-full text-[10px] font-black transition-all gap-1.5",
                        filterAuto ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" : "bg-white text-slate-500 hover:bg-slate-50"
                    )}
                >
                    <Zap className={cn("w-3 h-3", filterAuto ? "fill-emerald-500 text-emerald-500" : "")} />
                    AUTO-COMPLETE
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterExcluded(!filterExcluded)}
                    className={cn(
                        "h-7 px-3 rounded-full text-[10px] font-black transition-all gap-1.5",
                        filterExcluded ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" : "bg-white text-slate-500 hover:bg-slate-50"
                    )}
                >
                    <EyeOff className={cn("w-3 h-3", filterExcluded ? "fill-rose-500 text-rose-500" : "")} />
                    EXCLUDED
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterRecurring(!filterRecurring)}
                    className={cn(
                        "h-7 px-3 rounded-full text-[10px] font-black transition-all gap-1.5",
                        filterRecurring ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" : "bg-white text-slate-500 hover:bg-slate-50"
                    )}
                >
                    <RefreshCw className={cn("w-3 h-3", filterRecurring ? "animate-spin-slow" : "")} />
                    RECURRING
                </Button>

                {(filterAuto || filterExcluded || filterRecurring || search) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setFilterAuto(false);
                            setFilterExcluded(false);
                            setFilterRecurring(false);
                            setSearch('');
                        }}
                        className="h-7 px-2 text-[10px] text-slate-400 hover:text-slate-600 font-bold ml-auto"
                    >
                        Clear All
                    </Button>
                )}
            </div>

            {/* Scan Results Section */}
            {(scanResults.length > 0 || (hasScanned && !isScanning)) && (
                <div className="p-6 bg-blue-50/30 border-b animate-in slide-in-from-top duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <Label className="text-sm font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            {scanResults.length > 0 ? "Suggested Source Rules" : "Scan Complete"}
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
                            <Label className="text-slate-400 italic">No new source patterns found in your {transactions.length} transactions.</Label>
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
                                                const matches = transactions.filter(t => cleanSource(t.source) === res.name);
                                                setApplySelectedIds(new Set(matches.map(m => m.id)));

                                                setScanRule({
                                                    raw_name: res.name,
                                                    name: res.name,
                                                    category: res.category,
                                                    sub_category: res.sub || '',
                                                    auto_recurring: res.recurring || 'N/A',
                                                    auto_planned: res.planned || false,
                                                    auto_exclude: res.excluded || false,
                                                    skip_triage: true,
                                                    match_mode: 'fuzzy'
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
                                                        <TabsTrigger value="history">History ({transactions.filter(t => cleanSource(t.source) === scanRule.raw_name).length})</TabsTrigger>
                                                    </TabsList>
                                                </div>

                                                <TabsContent value="settings" className="mt-0">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] uppercase font-bold text-slate-500">Bank Transaction Pattern</Label>
                                                                <Input
                                                                    className="h-10 font-mono text-sm bg-white"
                                                                    value={scanRule.raw_name}
                                                                    onChange={(e) => setScanRule({ ...scanRule, raw_name: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] uppercase font-bold text-slate-500">Resolved Source Name</Label>
                                                                <SourceNameSelector
                                                                    value={scanRule.name}
                                                                    onChange={(v) => setScanRule({ ...scanRule, name: v })}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Category</Label>
                                                                    <CategorySelector
                                                                        value={scanRule.category}
                                                                        onValueChange={(v) => {
                                                                            if (v.includes(':')) {
                                                                                const [cat, sub] = v.split(':');
                                                                                setScanRule({ ...scanRule, category: cat, sub_category: sub });
                                                                            } else {
                                                                                setScanRule({ ...scanRule, category: v, sub_category: '' });
                                                                            }
                                                                        }}
                                                                        type="all"
                                                                        suggestionLimit={3}
                                                                        className="h-10 shadow-sm"
                                                                    />
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
                                                                                transactions.filter(t => cleanSource(t.source, settings.noiseFilters) === scanRule.raw_name).length > 0 &&
                                                                                transactions.filter(t => cleanSource(t.source, settings.noiseFilters) === scanRule.raw_name)
                                                                                    .every(t => applySelectedIds.has(t.id))
                                                                            }
                                                                            onCheckedChange={(checked) => {
                                                                                const matches = transactions.filter(t => cleanSource(t.source, settings.noiseFilters) === scanRule.raw_name);
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
                                                                    <th className="py-2 px-4 text-left">Source (Raw)</th>
                                                                    <th className="py-2 px-4 text-left">Category</th>
                                                                    <th className="py-2 px-4 text-right">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {transactions
                                                                    .filter(t => cleanSource(t.source, settings.noiseFilters) === scanRule.raw_name)
                                                                    .slice(0, 50)
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
                                                                            <td className="py-2 px-4 font-medium text-slate-700 truncate max-w-[200px]" title={tx.source}>{tx.source}</td>
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
                                    <th className="py-3 px-2 text-left">Original Source</th>
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
                                        <td className="py-2 px-2 font-medium text-slate-700">{tx.source}</td>
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

            <div className="p-4 space-y-4">
                {groupedRules.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Label className="text-slate-400 italic">No source rules found matching your search.</Label>
                    </div>
                ) : (
                    groupedRules.map((group) => {
                        const isExpanded = expandedGroups.has(group.name);
                        return (
                            <div key={group.name} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:border-slate-300">
                                <div
                                    className={cn(
                                        "p-4 flex items-center justify-between cursor-pointer select-none transition-colors",
                                        isExpanded ? "bg-slate-50 border-b" : "hover:bg-slate-50/50"
                                    )}
                                    onClick={() => toggleGroup(group.name)}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-blue-600 text-white font-black px-3 py-0.5 rounded-full text-sm">
                                                    {group.name}
                                                </Badge>
                                                {group.hasAuto && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] h-4">Auto</Badge>}
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[10px] font-bold">
                                                    {group.rules.length} Pattern{group.rules.length !== 1 ? 's' : ''}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600 font-bold px-1.5 py-0 rounded">
                                                        {group.category}
                                                    </Badge>
                                                    {group.sub_category && <span className="text-slate-300">/</span>}
                                                    {group.sub_category && <span className="text-[10px]">{group.sub_category}</span>}
                                                </span>
                                                {group.hasRecurring && <span className="flex items-center gap-1 text-blue-500"><RefreshCw className="w-3 h-3" /> Recurring</span>}
                                                {group.hasExcluded && <span className="flex items-center gap-1 text-rose-500"><EyeOff className="w-3 h-3" /> Excluded</span>}
                                                <span className="flex items-center gap-3 ml-2 pl-3 border-l border-slate-100">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="text-slate-400 uppercase text-[9px] font-black">History:</span>
                                                        <Badge variant="secondary" className="bg-slate-50 text-slate-700 text-[10px] px-1.5 py-0 h-4 border-slate-100">{group.transactionCount}</Badge>
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="text-slate-400 uppercase text-[9px] font-black">Spend:</span>
                                                        <span className="text-slate-700 font-bold text-[10px]">{formatCurrency(group.totalSpend, settings.currency)}</span>
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-8 w-8 p-0 transition-colors", refiningSource === group.name ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-blue-600")}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRefiningSource(refiningSource === group.name ? null : group.name);
                                            }}
                                        >
                                            <Search className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingRule({
                                                    clean_source_name: group.name,
                                                    auto_category: group.category,
                                                    auto_sub_category: group.sub_category,
                                                    auto_recurring: group.hasRecurring ? 'Monthly' : 'N/A',
                                                    skip_triage: group.hasAuto,
                                                    match_mode: 'fuzzy'
                                                });
                                            }}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                        <div className={cn("transition-transform duration-200", isExpanded && "rotate-180")}>
                                            <ChevronDown className="w-4 h-4 text-slate-300" />
                                        </div>
                                    </div>
                                </div>

                                {refiningSource === group.name && (
                                    <div className="p-6 bg-slate-50 border-b border-t border-blue-100 animate-in slide-in-from-top-2 duration-300">
                                        <SourceMappingRefiner
                                            source={group.name}
                                            txs={[]} // Not strictly needed for initial match, but refiner uses it for initial selection
                                            allPendingTxs={transactions.filter(t => !t.clean_source)}
                                            onSave={handleSaveSourceMapping}
                                            onCancel={() => setRefiningSource(null)}
                                        />
                                    </div>
                                )}

                                {isExpanded && (
                                    <div className="divide-y divide-slate-100 animate-in slide-in-from-top-2 duration-200">
                                        {group.rules.map((rule) => (
                                            <div key={rule.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 group/row">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                                                        <Target className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-sm text-slate-700 truncate">{rule.source_name || 'Missing Pattern'}</span>
                                                            {rule.match_mode === 'exact' && (
                                                                <Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0 border-indigo-200 text-indigo-600 bg-indigo-50 font-black">EXACT</Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Pattern Match</span>
                                                            {rule.skip_triage && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[8px] h-3.5 px-1">AUTO</Badge>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                                                        onClick={() => setHistoryRule(rule)}
                                                    >
                                                        <HistoryIcon className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                                                        onClick={() => setEditingRule({ ...rule })}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                                                        onClick={() => { if (confirm('Delete this pattern?')) deleteMutation.mutate(rule.id); }}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Editing Dialog */}
            <Dialog open={!!editingRule} onOpenChange={(o) => !o && setEditingRule(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Source Rule</DialogTitle>
                    </DialogHeader>
                    {editingRule && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Resolved Source Name</Label>
                                    <SourceNameSelector
                                        value={editingRule.clean_source_name}
                                        onChange={(v) => setEditingRule({ ...editingRule, clean_source_name: v })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <CategorySelector
                                        value={editingRule.auto_category}
                                        onValueChange={(v) => {
                                            if (v.includes(':')) {
                                                const [cat, sub] = v.split(':');
                                                setEditingRule({ ...editingRule, auto_category: cat, auto_sub_category: sub });
                                            } else {
                                                setEditingRule({ ...editingRule, auto_category: v, auto_sub_category: '' });
                                            }
                                        }}
                                        type="all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Sub-category</Label>
                                    <Select
                                        value={editingRule.auto_sub_category}
                                        onValueChange={(v) => setEditingRule({ ...editingRule, auto_sub_category: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {(displaySubCategories[editingRule.auto_category] || []).map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Recurring</Label>
                                    <Select value={editingRule.auto_recurring} onValueChange={(v) => setEditingRule({ ...editingRule, auto_recurring: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['N/A', 'Monthly', 'Annually', 'Bi-annually', 'Quarterly', 'Weekly', 'One-off'].map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 py-2 border-t pt-4">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={editingRule.skip_triage}
                                        onCheckedChange={(v) => setEditingRule({ ...editingRule, skip_triage: v })}
                                    />
                                    <Label>Auto-Complete</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={editingRule.auto_budget === 'Exclude'}
                                        onCheckedChange={(v) => setEditingRule({ ...editingRule, auto_budget: v ? 'Exclude' : null })}
                                    />
                                    <Label>Exclude</Label>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingRule(null)}>Cancel</Button>
                        <Button onClick={() => editMutation.mutate(editingRule)}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History Drill-down Dialog */}
            <Dialog open={!!historyRule} onOpenChange={(o) => !o && setHistoryRule(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <HistoryIcon className="w-5 h-5 text-slate-400" />
                            Transactions for "{historyRule?.clean_source_name}"
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto min-h-0 border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 border-b">
                                <tr className="text-[10px] uppercase font-black text-slate-400">
                                    <th className="py-3 px-4 text-left">Date</th>
                                    <th className="py-3 px-4 text-left">Raw Source</th>
                                    <th className="py-3 px-4 text-left">Category</th>
                                    <th className="py-3 px-4 text-right">Amount</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions
                                    .filter(t => {
                                        const clean = cleanSource(t.source, settings.noiseFilters).toLowerCase();
                                        const target = historyRule?.clean_source_name?.toLowerCase();
                                        const raw = historyRule?.source_name?.toLowerCase();
                                        return clean === target || t.clean_source?.toLowerCase() === target || t.source?.toLowerCase().includes(raw);
                                    })
                                    .map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50">
                                            <td className="py-2.5 px-4 font-mono text-xs text-slate-500">{tx.date}</td>
                                            <td className="py-2.5 px-4 font-medium text-slate-700">{tx.source}</td>
                                            <td className="py-2.5 px-4">
                                                <Badge variant="outline" className="font-normal">{tx.category || 'None'}</Badge>
                                            </td>
                                            <td className={cn("py-2.5 px-4 text-right font-bold", tx.amount < 0 ? "text-slate-800" : "text-emerald-600")}>
                                                {formatCurrency(tx.amount, settings.currency)}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedTransactionForEdit(tx)}
                                                    className="h-7 w-7 p-0"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </DialogContent>
            </Dialog>

            {
                selectedTransactionForEdit && (
                    <TransactionDetailDialog
                        transaction={selectedTransactionForEdit}
                        open={!!selectedTransactionForEdit}
                        onOpenChange={(o) => !o && setSelectedTransactionForEdit(null)}
                        onSave={handleUpdateTransaction}
                    />
                )}
        </Card>
    );
};
