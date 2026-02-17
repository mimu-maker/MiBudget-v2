import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Check, X, Search, AlertCircle, HelpCircle, Save, ArrowRight, Zap, RefreshCw, Calendar, ExternalLink, MoreVertical, Info, Store, History, ChevronRight, ChevronDown, Edit2, Trash2, AlertTriangle, Split, PlusCircle, Sparkles, PartyPopper, Tag, Settings as SettingsIcon, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { cleanSource, SKIP_PATTERNS } from '@/lib/importBrain';
import { SourceMappingRefiner } from './SourceMappingRefiner';
import { SourceNameSelector } from './SourceNameSelector';
import { TransactionNote } from './TransactionNote';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactionTable } from './hooks/useTransactionTable';
import { useProfile } from '@/contexts/ProfileContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAnnualBudget, useCategories } from '@/hooks/useAnnualBudget';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { TransactionSplitModal } from './TransactionSplitModal';
import { Transaction } from './hooks/useTransactionTable';
import { Checkbox } from "@/components/ui/checkbox";

interface SelectedRule {
    name: string;
    clean_name: string;
    category: string;
    sub_category: string;
    auto_recurring: string;
    auto_planned: boolean;
    auto_exclude: boolean;
    skip_triage: boolean;
    transactionIds: string[];
}

export const ValidationDashboard = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { userProfile } = useProfile();
    const { settings } = useSettings();
    const currentYear = new Date().getFullYear();
    const { budget } = useAnnualBudget(currentYear);
    const { categories: allCategories = [] } = useCategories();

    const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
    const [expandedSource, setExpandedSource] = useState<string | null>(null);
    const [selectedSourceRule, setSelectedSourceRule] = useState<SelectedRule | null>(null);
    const [splitModalOpen, setSplitModalOpen] = useState(false);
    const [transactionToSplit, setTransactionToSplit] = useState<Transaction | null>(null);
    const [showAllAudit, setShowAllAudit] = useState(false);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
    const [confirmingKeepGroupId, setConfirmingKeepGroupId] = useState<string | null>(null);
    const [confirmingDeleteAllDuplicates, setConfirmingDeleteAllDuplicates] = useState(false);

    const {
        transactions,
        isLoading,
        updateTransaction,
        bulkUpdate,
        isBulkUpdating,
        bulkDelete,
        deleteTransaction,
        differentiateTransaction
    } = useTransactionTable({ mode: 'all' });
    const [currentBucket, setCurrentBucket] = useState<string | undefined>(undefined);
    const [expandedValidationSource, setExpandedValidationSource] = useState<string | null>(null);

    // 2. Separate into the four requested buckets (disjoint sets)
    const duplicateGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        transactions.forEach(tx => {
            const key = `${tx.date}_${tx.amount}_${(tx.source || '').toLowerCase()}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(tx);
        });
        return Object.values(groups)
            .filter(g => g.length > 1)
            .sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime());
    }, [transactions]);

    const duplicateIds = useMemo(() => {
        const ids = new Set<string>();
        duplicateGroups.forEach(group => {
            group.forEach(tx => ids.add(tx.id));
        });
        return ids;
    }, [duplicateGroups]);

    const excludedTransactions = useMemo(() =>
        transactions.filter(tx => tx.status === 'Excluded' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    const auditLog = useMemo(() =>
        transactions.filter(tx => tx.status === 'Complete' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    const pendingSourceMapping = useMemo(() =>
        transactions.filter(tx => (!tx.confidence || tx.confidence <= 0) && tx.status !== 'Complete' && tx.status !== 'Excluded' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    const pendingCategorisation = useMemo(() =>
        transactions.filter(tx => tx.confidence > 0 && (!tx.category || !tx.sub_category) && tx.status !== 'Complete' && tx.status !== 'Excluded' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    const pendingValidation = useMemo(() =>
        transactions.filter(tx => tx.confidence > 0 && tx.category && tx.sub_category && tx.status !== 'Complete' && tx.status !== 'Excluded' && tx.status !== 'Pending Reconciliation' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    // Group items for rule configuration - SORTED by total amount
    const groupedSourceMapping = useMemo(() => {
        const groups: Record<string, { txs: any[], displayName: string }> = {};
        pendingSourceMapping.forEach(tx => {
            const rawName = tx.source || 'Unknown Source';
            const key = rawName.toLowerCase();
            if (!groups[key]) groups[key] = { txs: [], displayName: rawName };
            groups[key].txs.push(tx);
        });

        return Object.entries(groups)
            .map(([key, group]) => ({
                source: group.displayName,
                txs: group.txs,
                total: group.txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
            }))
            .sort((a, b) => b.total - a.total);
    }, [pendingSourceMapping]);

    const groupedCategorisation = useMemo(() => {
        const groups: Record<string, { txs: any[], displayName: string }> = {};
        pendingCategorisation.forEach(tx => {
            const rawName = tx.clean_source || 'Unknown';
            const key = rawName.toLowerCase();
            if (!groups[key]) groups[key] = { txs: [], displayName: rawName };
            groups[key].txs.push(tx);

            // Prefer the casing of the set clean_source
            if (tx.clean_source) groups[key].displayName = tx.clean_source;
        });

        // Convert to array of objects with metadata for sorting/rendering
        return Object.entries(groups).map(([key, group]) => {
            const total = group.txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
            return {
                source: group.displayName,
                txs: group.txs,
                total,
                avgAmount: group.txs.length > 0 ? total / group.txs.length : 0,
                latestDate: group.txs[0]?.date // Transactions are already sorted by date descending
            };
        }).sort((a, b) => b.total - a.total);
    }, [pendingCategorisation]);

    const [categorisationEdits, setCategorisationEdits] = useState<Record<string, { category: string, sub_category: string, status?: string }>>({});
    const [validationEdits, setValidationEdits] = useState<Record<string, { category: string, sub_category: string }>>({});

    const handleDeleteAllDuplicates = () => {
        const idsToDelete: string[] = [];
        duplicateGroups.forEach(group => {
            // Refined scoring to determine which one to keep
            // 1. Has both category AND sub_category (highest priority)
            // 2. Status is 'Complete'
            // 3. Most recently created/added
            const sorted = [...group].sort((a, b) => {
                const aHasInfo = (a.category && a.sub_category) ? 1 : 0;
                const bHasInfo = (b.category && b.sub_category) ? 1 : 0;
                if (aHasInfo !== bHasInfo) return bHasInfo - aHasInfo;

                const aComplete = a.status === 'Complete' ? 1 : 0;
                const bComplete = b.status === 'Complete' ? 1 : 0;
                if (aComplete !== bComplete) return bComplete - aComplete;

                const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                return bTime - aTime; // Newer first
            });

            const toKeep = sorted[0];
            group.forEach(tx => {
                if (tx.id !== toKeep.id) idsToDelete.push(tx.id);
            });
        });
        if (idsToDelete.length > 0) {
            bulkDelete(idsToDelete);
        }
        setConfirmingDeleteAllDuplicates(false);
    };

    // Grouping for Pending Validation: Source > Cat > SubCat
    const validationGroups = useMemo(() => {
        const sources: Record<string, {
            sourceName: string,
            txCount: number,
            total: number,
            categories: Record<string, {
                catName: string,
                total: number,
                subCategories: Record<string, {
                    subCatName: string,
                    txs: any[]
                }>
            }>
        }> = {};

        pendingValidation.forEach(tx => {
            const m = tx.clean_source;
            const c = tx.category;
            const s = tx.sub_category;

            if (!sources[m]) sources[m] = { sourceName: m, txCount: 0, total: 0, categories: {} };
            if (!sources[m].categories[c]) sources[m].categories[c] = { catName: c, total: 0, subCategories: {} };
            if (!sources[m].categories[c].subCategories[s]) sources[m].categories[c].subCategories[s] = { subCatName: s, txs: [] };

            sources[m].categories[c].subCategories[s].txs.push(tx);
            sources[m].txCount++;
            sources[m].total += Math.abs(tx.amount);
            sources[m].categories[c].total += Math.abs(tx.amount);
        });

        return Object.values(sources).map(m => ({
            ...m,
            avgAmount: m.txCount > 0 ? m.total / m.txCount : 0
        })).sort((a, b) => b.total - a.total);
    }, [pendingValidation]);

    // Track the first source of the current validation groups to auto-expand if needed
    const groupedValidation = useMemo(() => {
        const groups: Record<string, { txs: any[], displayName: string }> = {};
        pendingValidation.forEach(tx => {
            const rawName = tx.clean_source || tx.source || 'Unknown';
            const key = rawName.toLowerCase();
            if (!groups[key]) groups[key] = { txs: [], displayName: rawName };
            groups[key].txs.push(tx);

            // Prefer casing from clean_source if available
            if (tx.clean_source) groups[key].displayName = tx.clean_source;
        });
        return groups;
    }, [pendingValidation]);

    useMemo(() => {
        if (!expandedValidationSource && validationGroups.length > 0 && currentBucket === 'pending-validation') {
            setExpandedValidationSource(validationGroups[0].sourceName);
        }
    }, [validationGroups, currentBucket, expandedValidationSource]);

    const handleVerifyAllInGroup = (group: any) => {
        const allTxs: any[] = [];
        Object.values(group.categories).forEach((cat: any) => {
            Object.values(cat.subCategories).forEach((sub: any) => {
                allTxs.push(...sub.txs);
            });
        });

        const ids = allTxs.map(tx => tx.id);
        if (ids.length === 0) return;

        bulkUpdate({
            ids,
            updates: {
                status: 'Complete',
                confidence: 1
            }
        });

        // Auto-advance logic
        const currentIndex = validationGroups.findIndex(g => g.sourceName === group.sourceName);
        if (currentIndex < validationGroups.length - 1) {
            // Expand the next source in the same bucket
            setExpandedValidationSource(validationGroups[currentIndex + 1].sourceName);
        } else {
            // End of validation list, look for next non-empty bucket
            if (pendingSourceMapping.length > 0) setCurrentBucket('pending-source');
            else if (pendingCategorisation.length > 0) setCurrentBucket('pending-categorisation');
            else if (pendingValidation.length > 0) setCurrentBucket('pending-validation');
            else if (duplicateGroups.length > 0) setCurrentBucket('potential-duplicates');
        }
    };

    // Reusable category lists from the global categories table (more robust than active budget)
    const categoryList = useMemo(() => {
        return allCategories.map(c => c.name).sort();
    }, [allCategories]);

    const getSubCategoryList = useMemo(() => (categoryName: string) => {
        const cat = allCategories.find(c => c.name === categoryName);
        if (!cat || !cat.sub_categories) return [];
        return cat.sub_categories.map((s: any) => s.name).sort();
    }, [allCategories]);

    // Calculate default open section
    const defaultOpen = useMemo(() => {
        if (duplicateGroups.length > 0) return "potential-duplicates";
        if (pendingSourceMapping.length > 0) return "pending-source";
        if (pendingCategorisation.length > 0) return "pending-categorisation";
        if (pendingValidation.length > 0) return "pending-validation";
        return "audit-log";
    }, [duplicateGroups.length, pendingSourceMapping.length, pendingCategorisation.length, pendingValidation.length]);

    // Initialize currentBucket when defaultOpen changes and currentBucket is not set
    useMemo(() => {
        if (currentBucket === undefined && defaultOpen) {
            setCurrentBucket(defaultOpen);
        }
    }, [defaultOpen, currentBucket]);

    // Simplified: Using centralization in useTransactionTable

    const createRuleMutation = useMutation({
        mutationFn: async ({ name, clean_source, category, sub_category, auto_recurring, auto_planned, skip_triage, auto_budget }: {
            name: string,
            clean_source: string,
            category: string,
            sub_category: string | null,
            auto_recurring: string,
            auto_planned: boolean,
            skip_triage: boolean,
            auto_budget?: string | null
        }) => {
            // 1. Save Source Settings (Centralized)
            const { error: sourceSettingsError } = await supabase
                .from('sources')
                .upsert({
                    user_id: user?.id,
                    name: clean_source || name, // Use clean name as the identifier for source settings
                    recurring: auto_recurring,
                    is_auto_complete: false // FORCE DISABLE: Auto-complete system-wide disable
                }, { onConflict: 'user_id, name' });

            if (sourceSettingsError) {
                console.error("Error saving source settings:", sourceSettingsError);
                throw sourceSettingsError;
            }

            // 2. Save Rule
            let { error } = await supabase
                .from('source_rules')
                .upsert([{
                    user_id: user?.id,
                    source_name: name,
                    clean_source_name: clean_source || name,
                    auto_category: category,
                    auto_sub_category: sub_category,
                    auto_planned: auto_planned,
                    auto_budget: auto_budget
                }], { onConflict: 'user_id, source_name' });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['source_rules'] });
            queryClient.invalidateQueries({ queryKey: ['sources'] }); // Invalidate sources
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['existing-source-names-ranked'] });
            setRuleDialogOpen(false);
            setExpandedSource(null);
        }
    });

    const handleVerifySingle = (tx: any, category?: string, sub_category?: string | null) => {
        const finalCategory = category !== undefined ? category : tx.category;
        const finalSubCategory = sub_category !== undefined ? sub_category : tx.sub_category;
        const isExcluded = tx.budget === 'Exclude' || tx.excluded;

        // Requirement: category and sub_category are required to mark as Complete
        const canComplete = isExcluded || (finalCategory && finalSubCategory);

        updateTransaction({
            id: tx.id,
            field: 'status' as any, // We'll pass updates as a bulk if needed, or just multiple single ones
            value: canComplete ? 'Complete' : 'Pending Triage',
        });
        // We'll need to update other fields too - wait, updateTransaction only takes one field.
        // Let's use bulkUpdate with a single ID for multi-field updates.
        bulkUpdate({
            ids: [tx.id],
            updates: {
                status: canComplete ? 'Complete' : 'Pending Triage',
                category: finalCategory,
                sub_category: finalSubCategory,
                recurring: tx.recurring || 'N/A',
                confidence: 1
            }
        });
    };

    const openRuleDialog = (sourceName: string, txs: any[], inline: boolean = false) => {
        const ruleData: SelectedRule = {
            name: txs[0]?.source || sourceName, // Raw name from DB
            clean_name: txs[0]?.clean_source || '', // Existing clean name if any
            category: txs[0]?.category || '',
            sub_category: txs[0]?.sub_category || '',
            auto_recurring: txs[0]?.recurring || 'Monthly',
            auto_planned: true, // Default to Planned
            auto_exclude: txs[0]?.excluded || false,
            skip_triage: txs[0]?.status === 'Complete',
            transactionIds: txs.map(t => t.id)
        };

        setSelectedSourceRule(ruleData);
        if (inline) {
            setExpandedSource(sourceName);
        } else {
            setRuleDialogOpen(true);
        }
    };

    const handleSaveRule = async (ruleOrStatus?: any, maybeStatus?: string) => {
        let ruleToUse = selectedSourceRule;
        let overrideStatus = maybeStatus;

        if (ruleOrStatus) {
            if (typeof ruleOrStatus === 'string') {
                overrideStatus = ruleOrStatus;
            } else {
                ruleToUse = ruleOrStatus;
                if (ruleOrStatus.overrideStatus) {
                    overrideStatus = ruleOrStatus.overrideStatus;
                }
            }
        }

        if (!ruleToUse) return;

        const isInlineMode = !!expandedSource || (ruleOrStatus && typeof ruleOrStatus === 'object');
        const shouldSaveRule = !isInlineMode;

        // 1. Create the rule ONLY if explicitly in Rule Mode (Dialog/Audit) 
        if (shouldSaveRule) {
            try {
                await createRuleMutation.mutateAsync({
                    name: ruleToUse.name,
                    clean_source: ruleToUse.clean_name,
                    category: ruleToUse.category,
                    sub_category: ruleToUse.sub_category,
                    auto_recurring: ruleToUse.auto_recurring,
                    auto_planned: ruleToUse.auto_planned,
                    auto_budget: ruleToUse.auto_exclude ? 'Exclude' : null,
                    skip_triage: false // FORCE DISABLE
                });
            } catch (error) {
                console.warn("Failed to update source rule, proceeding with transaction updates...", error);
            }
        }

        // 2. Apply to current transactions
        const updates: any = {
            category: ruleToUse.category,
            sub_category: ruleToUse.sub_category,
            recurring: ruleToUse.auto_recurring,
            planned: ruleToUse.auto_planned,
            excluded: ruleToUse.auto_exclude,
            clean_source: ruleToUse.clean_name,
            // Status is Complete if either excluded or fully categorized, unless overridden
            status: overrideStatus || ((ruleToUse.auto_exclude || (ruleToUse.category && ruleToUse.sub_category)) ? 'Complete' : 'Pending Triage'),
            confidence: 1
        };

        // Use bulkUpdate mutation for proper invalidation and state management
        bulkUpdate({
            ids: ruleToUse.transactionIds,
            updates: updates
        });

        // Close expansion/dialog
        setExpandedSource(null);
        setSelectedSourceRule(null);
        setRuleDialogOpen(false);
    };

    const handleSaveSourceMapping = async (cleanName: string, pattern: string, ids: string[]) => {
        // 1. Create the rule (try/catch to allow transaction update even if rule saving fails due to permissions)
        try {
            await createRuleMutation.mutateAsync({
                name: pattern,
                clean_source: cleanName,
                category: '', // No category yet
                sub_category: null,
                auto_recurring: 'N/A',
                auto_planned: true,
                skip_triage: false
            });
        } catch (error) {
            console.warn("Failed to save source rule (likely permission issue), proceeding with transaction update...", error);
        }

        // 2. Apply to current transactions
        bulkUpdate({
            ids: ids,
            updates: {
                clean_source: cleanName,
                status: 'Pending Triage',
                confidence: 1,
            }
        });

        setExpandedSource(null);
    };

    const SearchLink = ({ name, txs }: { name: string, txs?: any[] }) => {
        const query = encodeURIComponent(`Identify this source: ${name}`);
        const url = `https://www.google.com/search?q=${query}`;

        if (!txs || txs.length === 0) {
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 p-1 px-2 rounded-md bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors text-[10px] font-bold uppercase tracking-wider"
                >
                    <Search className="w-3 h-3" />
                    Who is this?
                </a>
            );
        }

        return (
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="inline-flex items-center gap-1.5 p-1 px-2 rounded-md bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors text-[10px] font-bold uppercase tracking-wider h-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Search className="w-3 h-3" />
                        Who is this? & Actions
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 shadow-2xl border-blue-100" align="start" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 space-y-4 text-left">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Associate or Create Source</Label>
                            <SourceNameSelector
                                value={txs[0]?.clean_source || txs[0]?.source}
                                hideAddNew={false}
                                onChange={(newValue) => {
                                    // Trigger the rule dialog flow
                                    openRuleDialog(newValue || txs[0]?.source, txs, true);
                                }}
                                className="h-9"
                            />
                            <p className="text-[10px] text-slate-400 italic">
                                Type to search existing sources or create a new one.
                            </p>
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-[10px] font-bold uppercase text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8 gap-2"
                                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                            >
                                <Search className="w-3.5 h-3.5" />
                                Who is this? (Google Search)
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    };

    const TransactionCard = ({ tx, type, variant = 'blue' }: { tx: any, type: 'review' | 'unknown' | 'confirmed', variant?: 'lime' | 'emerald' | 'blue' | 'rose' | 'orange' | 'amber' }) => {
        const isExpanded = expandedSource === tx.id;

        return (
            <div className={cn(
                "rounded-xl transition-all duration-300 overflow-hidden",
                isExpanded ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg mb-4" : "space-y-2"
            )}>
                <Card
                    className={cn(
                        "py-2 px-4 border-l-4 transition-all duration-300 hover:shadow-xl cursor-pointer rounded-xl border-b border-r shadow-sm backdrop-blur-sm",
                        variant === 'rose' ? "border-l-rose-500 border-rose-100/30 bg-rose-50/60 font-semibold text-rose-950 shadow-rose-100/20" :
                            variant === 'orange' ? "border-l-orange-500 border-orange-100/30 bg-orange-50/60 font-semibold text-orange-950 shadow-orange-100/20" :
                                variant === 'amber' ? "border-l-amber-500 border-amber-100/30 bg-amber-50/60 font-semibold text-amber-950 shadow-amber-100/20" :
                                    variant === 'lime' ? "border-l-lime-500 border-lime-100/30 bg-lime-50/60 font-semibold text-lime-950 shadow-lime-100/20" :
                                        variant === 'emerald' ? "border-l-emerald-500 border-emerald-100/30 bg-emerald-50/60 font-semibold text-emerald-950 shadow-emerald-100/20" :
                                            type === 'confirmed' ? "border-l-emerald-500 bg-emerald-50/20 opacity-80" :
                                                "border-l-blue-400 bg-blue-50/40 font-semibold text-blue-950 shadow-blue-100/20",
                        isExpanded && "ring-2 ring-primary/20 shadow-xl"
                    )}
                    onClick={() => {
                        if (type === 'confirmed') return;
                        if (isExpanded) {
                            setExpandedSource(null);
                        } else {
                            openRuleDialog(tx.clean_source || tx.source, [tx], true);
                            setExpandedSource(tx.id);
                        }
                    }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 w-full">
                        {/* Column 1: Source & Metadata */}
                        <div className="md:col-span-4 min-w-0">
                            <div className="flex flex-col">
                                <h3 className="font-bold text-slate-800 truncate text-sm flex items-center gap-2 group">
                                    {tx.clean_source ? (
                                        <Badge variant="secondary" className="bg-blue-600 text-white border-blue-400 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-tight shrink-0 shadow-sm shadow-blue-200">
                                            {tx.clean_source}
                                        </Badge>
                                    ) : (
                                        <span className="text-slate-400 italic font-normal text-xs">(Pending)</span>
                                    )}
                                    <span className="text-[10px] font-normal text-slate-300 italic truncate group-hover:text-slate-400 transition-colors">[{tx.source}]</span>
                                    <TransactionNote
                                        transaction={tx}
                                        onSave={(id, note) => updateTransaction({ id, field: 'notes', value: note })}
                                    />
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatDate(tx.date, userProfile?.show_time, userProfile?.date_format)}</p>
                                    {tx.description && <span className="text-[10px] text-slate-300 italic truncate max-w-[150px]">• {tx.description}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Category & Flags (The "Middle") */}
                        <div className="md:col-span-5 flex items-center gap-3">
                            {(type === 'review' || type === 'confirmed') && tx.category && !isExpanded && (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/50 border border-blue-100/30 text-[10px] font-black text-blue-700 uppercase tracking-tighter shadow-sm shrink-0">
                                    <Tag className="w-2.5 h-2.5 opacity-50" />
                                    {tx.category} {tx.sub_category && <><span className="mx-1 opacity-20">/</span> {tx.sub_category}</>}
                                </div>
                            )}

                            <div className="flex items-center gap-1.5">
                                {tx.recurring && tx.recurring !== 'N/A' && (
                                    <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] font-bold border-emerald-100 bg-emerald-50 text-emerald-700 flex items-center gap-1 shrink-0">
                                        <RefreshCw className="w-2.5 h-2.5" />
                                        {tx.recurring}
                                    </Badge>
                                )}
                                {tx.planned === false && (
                                    <Badge variant="outline" className="h-4.5 px-1.5 text-[9px] font-bold border-amber-100 bg-amber-50 text-amber-700 shrink-0">
                                        Unplanned
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Column 3: Amount & Actions */}
                        <div className="md:col-span-3 flex items-center justify-end gap-6 overflow-hidden">
                            <p className="font-mono tabular-nums font-black text-slate-900 text-[15px] tracking-tight shrink-0">
                                {formatCurrency(tx.amount, settings.currency)}
                            </p>

                            <div className="flex items-center gap-1.5 border-l border-slate-100 pl-4 shrink-0">
                                {type !== 'confirmed' && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTransactionToSplit(tx);
                                            setSplitModalOpen(true);
                                        }}
                                        title="Split / Itemize Transaction"
                                    >
                                        <Split className="w-4 h-4" />
                                    </Button>
                                )}
                                {type === 'confirmed' ? (
                                    <div className="h-8 w-8 flex items-center justify-center">
                                        <Check className="w-4.5 h-4.5 text-emerald-500" />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleVerifySingle(tx);
                                            }}
                                        >
                                            <Check className="w-5 h-5" />
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-500 rounded-lg">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => {
                                                    e.stopPropagation();
                                                    bulkUpdate({
                                                        ids: [tx.id],
                                                        updates: { status: 'Pending Reconciliation', confidence: 1 }
                                                    });
                                                }}>
                                                    Mark Pending Reconciliation
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {isExpanded && (
                    <div className="p-8 bg-white border-t border-slate-100 animate-in slide-in-from-top-2 duration-300 shadow-inner">
                        <div className="w-full">
                            <RuleForm
                                rule={selectedSourceRule}
                                setRule={setSelectedSourceRule}
                                onSave={handleSaveRule}
                                onCancel={() => setExpandedSource(null)}
                                budget={budget}
                                isInline={true}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const RuleForm = ({ rule, setRule, onSave, onCancel, budget, isInline = false }: {
        rule: SelectedRule | null,
        setRule: (rule: any) => void,
        onSave: (status?: string) => void,
        onCancel: () => void,
        budget: any,
        isInline?: boolean
    }) => {
        const [showErrors, setShowErrors] = useState(false);
        if (!rule) return null;

        const validateAndSave = (status?: string) => {
            if (!rule.auto_exclude) {
                if (!rule.category || !rule.sub_category) {
                    setShowErrors(true);
                    return;
                }
            }
            onSave(status);
        };

        const subCats = getSubCategoryList(rule.category);

        return (
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-center gap-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-100/80 shadow-inner relative">
                    <div className="flex-1 space-y-2 w-full">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Input Name (Bank Reference)</Label>
                        <div className="py-2.5 px-4 bg-white rounded-xl border border-slate-200/60 shadow-sm">
                            <p className="text-sm font-mono font-bold text-slate-600 truncate">{rule.name}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center mt-4 md:mt-6 shrink-0 px-2 group/maps">
                        <span className="text-[10px] uppercase font-black text-blue-400 tracking-widest leading-none mb-1.5 group-hover/maps:text-blue-500 transition-colors">Maps To</span>
                        <div className="w-full flex items-center relative h-1">
                            <div className="h-[2px] w-full bg-blue-500/60 rounded-full relative shadow-sm">
                                <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t-2 border-r-2 border-blue-500 rotate-45 rounded-tr-[1px]" />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 space-y-2 w-full">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Display Name (Clean Product/Service)</Label>
                        <SourceNameSelector
                            value={rule.clean_name}
                            hideAddNew={false}
                            onChange={(v) => setRule((p: any) => p ? { ...p, clean_name: v } : null)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3 space-y-1.5">
                        <Label className={cn("text-[10px] uppercase font-black tracking-widest", showErrors && !rule.category && !rule.auto_exclude ? "text-red-500" : "text-slate-400")}>Category</Label>
                        <CategorySelector
                            value={rule.category}
                            onValueChange={(v) => {
                                if (v.includes(':')) {
                                    const [cat, sub] = v.split(':');
                                    setRule((p: any) => p ? { ...p, category: cat, sub_category: sub } : null);
                                } else {
                                    setRule((p: any) => p ? { ...p, category: v, sub_category: '' } : null);
                                }
                            }}
                            hideSuggestions={true}
                            className="h-10 shadow-sm border-slate-200 rounded-xl bg-white"
                            disabled={rule.auto_exclude}
                            type="all"
                            suggestionLimit={3}
                            placeholder={rule.auto_exclude ? "N/A" : "Select category"}
                        />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                        <Label className={cn("text-[10px] uppercase font-black tracking-widest", showErrors && !rule.sub_category && !rule.auto_exclude ? "text-red-500" : "text-slate-400")}>Sub-category</Label>
                        <Select
                            value={rule.sub_category}
                            onValueChange={(v) => setRule((p: any) => p ? { ...p, sub_category: v } : null)}
                            disabled={!rule.category || rule.auto_exclude}
                        >
                            <SelectTrigger className={cn("bg-white h-10 text-xs shadow-sm", showErrors && !rule.sub_category && !rule.auto_exclude && "border-red-500 ring-1 ring-red-500")}>
                                <SelectValue placeholder={rule.auto_exclude ? "N/A" : "Select Sub"} />
                            </SelectTrigger>
                            <SelectContent>
                                {subCats.length > 0 ? (
                                    subCats.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)
                                ) : (
                                    <p className="p-2 text-xs text-slate-400 italic">No budgeted sub-categories</p>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="md:col-span-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Frequency</Label>
                            <Select
                                value={rule.auto_recurring}
                                onValueChange={(v) => setRule((p: any) => p ? { ...p, auto_recurring: v } : null)}
                                disabled={rule.auto_exclude}
                            >
                                <SelectTrigger className="bg-white h-10 text-xs shadow-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="N/A">N/A</SelectItem>
                                    <SelectItem value="Monthly">Monthly</SelectItem>
                                    <SelectItem value="Annually">Annually</SelectItem>
                                    <SelectItem value="Bi-annually">Bi-annually</SelectItem>
                                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                                    <SelectItem value="Weekly">Weekly</SelectItem>
                                    <SelectItem value="One-off">One-off</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Settings</Label>
                            <div className="flex items-center gap-2 h-10 px-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Auto-Comp</span>
                                <Switch
                                    checked={rule.skip_triage}
                                    onCheckedChange={(v) => setRule((p: any) => p ? { ...p, skip_triage: v } : null)}
                                    disabled={rule.auto_exclude}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">&nbsp;</Label>
                            <div className="flex items-center gap-2 h-10 px-3 bg-amber-50 rounded-xl border border-amber-100 shadow-sm">
                                <span className="text-[9px] font-bold text-amber-600 uppercase">Auto-Excl</span>
                                <Switch
                                    checked={rule.auto_exclude}
                                    onCheckedChange={(v) => setRule((p: any) => p ? { ...p, auto_exclude: v } : null)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">&nbsp;</Label>
                            <div className="flex items-center gap-2 h-10 px-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Unplanned</span>
                                <Switch
                                    checked={!rule.auto_planned}
                                    onCheckedChange={(v) => setRule((p: any) => p ? { ...p, auto_planned: !v } : null)}
                                    disabled={rule.auto_exclude}
                                />
                            </div>
                        </div>
                    </div>
                </div>



                {rule.auto_recurring !== 'N/A' && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-left-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <RefreshCw className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold text-amber-900">Recurring Pattern Detected</p>
                                <p className="text-[10px] text-amber-700/80 font-medium">Found other similar transactions for {rule.clean_name || rule.name}.</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100 h-8 text-[10px] font-black uppercase tracking-tight"
                            onClick={() => {
                                // Find all transactions with same source/clean_source
                                const sameSourceTxs = transactions.filter(t =>
                                    (t.source === rule.name || t.clean_source === rule.clean_name) &&
                                    !rule.transactionIds.includes(t.id) &&
                                    t.status !== 'Complete'
                                );
                                if (sameSourceTxs.length > 0) {
                                    setRule(p => ({
                                        ...p,
                                        transactionIds: [...p.transactionIds, ...sameSourceTxs.map(t => t.id)]
                                    }));
                                }
                            }}
                        >
                            Include all matching
                        </Button>
                    </div>
                )}

                {(isInline || !rule.auto_exclude) && (
                    <Alert className={cn("mt-6 border-blue-100", isInline ? "bg-slate-100" : "bg-blue-50")}>
                        <Info className={cn("w-4 h-4", isInline ? "text-slate-400" : "text-blue-500")} />
                        <AlertDescription className={cn("text-[11px] font-medium", isInline ? "text-slate-500" : "text-blue-700")}>
                            {isInline
                                ? `Confirming these settings for ${rule.transactionIds.length} transaction(s). Global source mapping will NOT be affected.`
                                : `New automation rule will apply to ${rule.transactionIds.length} tx and all future imports.`
                            }
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-blue-100/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        className="text-slate-400 hover:text-slate-600 font-bold uppercase text-[10px] tracking-widest"
                    >
                        Cancel
                    </Button>
                    {isInline && (
                        <Button
                            onClick={() => validateAndSave('Pending Reconciliation')}
                            className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest px-6 h-10 shadow-sm transition-all"
                        >
                            <History className="w-4 h-4 mr-2" />
                            Mark Pending Recon
                        </Button>
                    )}
                    <Button
                        onClick={() => validateAndSave()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest px-6 h-10 shadow-lg shadow-blue-200/50"
                    >
                        {isInline ? 'Confirm Changes & Mark Complete' : 'Save Automation Rule'}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full p-2 space-y-6">
            {duplicateGroups.length === 0 && pendingValidation.length === 0 && pendingSourceMapping.length === 0 && pendingCategorisation.length === 0 && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-100/80 p-2.5 rounded-xl shadow-inner">
                            <Sparkles className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-emerald-900 uppercase tracking-tight">Triage Complete</h2>
                            <p className="text-xs text-emerald-700/70 font-bold uppercase tracking-tighter">Every transaction has been verified and categorised</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-xl shadow-sm border border-emerald-100 text-emerald-600">
                        <Check className="w-4 h-4" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Perfect Clarity</span>
                    </div>
                </div>
            )}

            <Accordion type="single" collapsible value={currentBucket} onValueChange={setCurrentBucket} className="w-full space-y-4">
                {/* 1. Potential Duplicates - TOP PRIORITY */}
                {duplicateGroups.length > 0 && (
                    <AccordionItem value="potential-duplicates" className="border rounded-xl bg-card shadow-sm overflow-hidden border-rose-200">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-rose-50/50 transition-colors">
                            <div className="flex items-center justify-between w-full pr-4 text-rose-900">
                                <div className="flex items-center gap-3">
                                    <div className="bg-rose-100 p-2 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold text-rose-900">Potential Duplicates</h3>
                                        <p className="text-xs text-rose-600/70 font-medium italic">Clear duplicates first to ensure accurate data</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {duplicateGroups.length > 0 && (
                                        <Button
                                            size="sm"
                                            variant={confirmingDeleteAllDuplicates ? "destructive" : "outline"}
                                            className={cn(
                                                "h-7 px-3 text-[10px] font-black tracking-tighter transition-all",
                                                !confirmingDeleteAllDuplicates && "text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirmingDeleteAllDuplicates) {
                                                    handleDeleteAllDuplicates();
                                                } else {
                                                    setConfirmingDeleteAllDuplicates(true);
                                                    setTimeout(() => setConfirmingDeleteAllDuplicates(false), 3000);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                                            {confirmingDeleteAllDuplicates ? "CONFIRM DELETE EXTRA COPIES" : "CLEAN ALL DUPLICATES"}
                                        </Button>
                                    )}
                                    <Badge variant="secondary" className="bg-rose-600 text-white font-black px-3 py-1 text-sm">
                                        {duplicateGroups.length} Groups
                                    </Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-4">
                            <div className="space-y-6">
                                {duplicateGroups.map((group, idx) => (
                                    <div key={idx} className="border rounded-xl overflow-hidden border-slate-200 bg-white shadow-sm">
                                        <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex justify-between items-center text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                            <div className="flex items-center gap-3">
                                                <span>Group {idx + 1} - Exact Matches</span>
                                                <span className="text-rose-600 italic">Review before deleting</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={confirmingKeepGroupId === `group-${idx}` ? "default" : "ghost"}
                                                className={cn(
                                                    "h-7 px-3 text-[10px] font-bold transition-all",
                                                    confirmingKeepGroupId === `group-${idx}`
                                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                )}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirmingKeepGroupId === `group-${idx}`) {
                                                        // Permanently differentiate transactions in this group
                                                        // We skip the first one (keep original time) and shift others by 1, 2, 3... hours
                                                        for (let i = 1; i < group.length; i++) {
                                                            await differentiateTransaction(group[i].id, i);
                                                        }
                                                        setConfirmingKeepGroupId(null);
                                                    } else {
                                                        setConfirmingKeepGroupId(`group-${idx}`);
                                                        setTimeout(() => setConfirmingKeepGroupId(prev => prev === `group-${idx}` ? null : prev), 3000);
                                                    }
                                                }}
                                            >
                                                <PlusCircle className="w-3.5 h-3.5 mr-2" />
                                                {confirmingKeepGroupId === `group-${idx}`
                                                    ? (group.length > 2 ? "CONFIRM KEEP ALL" : "CONFIRM KEEP BOTH")
                                                    : (group.length > 2 ? "KEEP ALL" : "KEEP BOTH")}
                                            </Button>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {group.map(tx => (
                                                <div key={tx.id} className="flex items-center p-3 hover:bg-rose-50/80 group/row transition-all duration-200 hover:rounded-xl hover:mx-1 hover:shadow-sm border-b border-transparent last:border-0 border-slate-50">
                                                    <div className="flex-1 flex items-center gap-4">
                                                        <span className="w-[80px] text-[11px] font-mono text-slate-400 shrink-0">
                                                            {formatDate(tx.date, userProfile?.show_time, userProfile?.date_format)}
                                                        </span>

                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                {tx.clean_source ? (
                                                                    <Badge variant="secondary" className="bg-blue-600 text-white border-blue-400 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-tight shrink-0 shadow-sm shadow-blue-200">
                                                                        {tx.clean_source}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-sm font-bold text-slate-900 truncate block">{tx.source}</span>
                                                                )}
                                                                <TransactionNote
                                                                    transaction={tx}
                                                                    onSave={(id, note) => updateTransaction({ id, field: 'notes', value: note })}
                                                                />
                                                            </div>
                                                            {tx.clean_source && tx.clean_source !== tx.source && (
                                                                <span className="text-[10px] text-slate-400 italic block mt-0.5 ml-1">Original: {tx.source}</span>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="secondary" className="text-[9px] h-4 py-0 bg-slate-100 text-slate-500">
                                                                    {tx.status}
                                                                </Badge>
                                                                {tx.category && (
                                                                    <span className="text-[10px] text-slate-400 truncate">
                                                                        {tx.category} {'>'} {tx.sub_category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 w-[200px] justify-end">
                                                        <span className={cn("font-black font-mono tabular-nums text-sm", tx.amount < 0 ? "text-slate-900" : "text-emerald-600")}>
                                                            {formatCurrency(tx.amount, settings.currency)}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {tx.status === 'Complete' ? (
                                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5 h-6 text-[10px] font-bold">KEEPING</Badge>
                                                            ) : (
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        size="sm"
                                                                        variant={confirmingDeleteId === tx.id ? "destructive" : "ghost"}
                                                                        className={cn(
                                                                            confirmingDeleteId === tx.id ? "h-8 px-3 w-auto text-[10px] font-bold" : "h-8 w-8 p-0 text-slate-400 hover:text-rose-600 transition-colors"
                                                                        )}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (confirmingDeleteId === tx.id) {
                                                                                deleteTransaction(tx.id);
                                                                                setConfirmingDeleteId(null);
                                                                            } else {
                                                                                setConfirmingDeleteId(tx.id);
                                                                                setTimeout(() => setConfirmingDeleteId(prev => prev === tx.id ? null : prev), 3000);
                                                                            }
                                                                        }}
                                                                        title={confirmingDeleteId === tx.id ? "Click again to confirm" : "Delete Transaction"}
                                                                    >
                                                                        {confirmingDeleteId === tx.id ? "CONFIRM" : <Trash2 className="w-4 h-4" />}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {
                                    duplicateGroups.length === 0 && (
                                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 italic">
                                            <Check className="w-12 h-12 mb-3 opacity-20" />
                                            <p>No potential duplicates found</p>
                                        </div>
                                    )
                                }
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* 2. Source Mapping (Unmapped Sources) */}
                {pendingSourceMapping.length > 0 && (
                    <AccordionItem value="pending-source" className="border rounded-xl bg-card shadow-sm overflow-hidden border-orange-200">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-orange-50/50 transition-colors">
                            <div className="flex items-center justify-between w-full pr-4 text-orange-900">
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-100 p-2 rounded-lg">
                                        <HelpCircle className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold">Pending Source Mapping</h3>
                                        <p className="text-xs text-orange-600/70 font-medium">Transactions with missing source rules</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-orange-600 text-white font-black px-3 py-1 text-sm">
                                    {pendingSourceMapping.length} {pendingSourceMapping.length === 1 ? 'Item' : 'Items'} Pending
                                </Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-4">
                            <div className="space-y-4">
                                {groupedSourceMapping.map(({ source, txs, total }) => (
                                    <div key={source} className="space-y-3 p-4 bg-white border rounded-xl shadow-sm border-slate-200">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-black text-slate-900 leading-none">Input: {source}</h4>
                                                    <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold border-slate-200 bg-slate-50">{txs.length} {txs.length === 1 ? 'tx' : 'txs'}</Badge>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 text-[9px] font-bold text-slate-400 hover:text-blue-600 gap-1.5 p-0 px-1 bg-transparent"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/settings?tab=sources&search=${encodeURIComponent(source)}`);
                                                        }}
                                                    >
                                                        <SettingsIcon className="w-2.5 h-2.5" />
                                                        Edit Rules
                                                    </Button>
                                                    <span className="text-xs font-bold text-slate-400 ml-2">Total: {formatCurrency(total, settings.currency)}</span>
                                                </div>
                                                <SearchLink name={source} txs={txs} />
                                            </div>
                                            <Button
                                                size="sm"
                                                className={cn(
                                                    "h-8 font-bold gap-2 shadow-lg",
                                                    expandedSource === source
                                                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                        : "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100"
                                                )}
                                                onClick={() => {
                                                    if (expandedSource === source) setExpandedSource(null);
                                                    else {
                                                        // Initialize selection with just this source's current group
                                                        const ruleData: SelectedRule = {
                                                            name: source,
                                                            clean_name: source,
                                                            category: '',
                                                            sub_category: '',
                                                            auto_recurring: 'N/A',
                                                            auto_planned: true,
                                                            auto_exclude: false,
                                                            skip_triage: false,
                                                            transactionIds: txs.map(t => t.id)
                                                        };
                                                        setSelectedSourceRule(ruleData);
                                                        setExpandedSource(source);
                                                    }
                                                }}
                                            >
                                                {expandedSource === source ? 'Cancel' : <><Store className="w-4 h-4" /> Map Source</>}
                                            </Button>
                                        </div>

                                        {expandedSource === source && (
                                            <div className="mt-4 p-5 bg-slate-50 border-2 border-orange-100 rounded-2xl animate-in zoom-in-95 duration-300">
                                                <SourceMappingRefiner
                                                    source={source}
                                                    txs={txs}
                                                    allPendingTxs={transactions.filter(t => t.status !== 'Complete' && !duplicateIds.has(t.id))}
                                                    onSave={handleSaveSourceMapping}
                                                    onCancel={() => setExpandedSource(null)}
                                                    onUpdateNote={(id, note) => updateTransaction({ id, field: 'notes', value: note })}
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-0.5 pt-2 border-t border-slate-50">
                                            <div className="flex items-center px-4 py-1.5 text-[10px] uppercase font-black text-slate-400 tracking-wider bg-slate-50/30">
                                                <span className="w-[100px]">Date</span>
                                                <span className="flex-1">Source (Raw)</span>
                                                <span className="w-[120px] text-right">Amount</span>
                                            </div>
                                            {txs.map(tx => (
                                                <div key={tx.id} className="flex items-center p-1 px-4 hover:bg-orange-50/80 rounded-lg group/row text-[11px] transition-all duration-200 hover:shadow-sm mx-1">
                                                    <span className="w-[100px] text-slate-400 font-mono shrink-0">{formatDate(tx.date, userProfile?.show_time, userProfile?.date_format)}</span>
                                                    <div className="flex-1 flex items-center gap-2 min-w-0">
                                                        <span className="text-slate-600 truncate font-medium">{tx.source}</span>
                                                        <TransactionNote
                                                            transaction={tx}
                                                            onSave={(id, note) => updateTransaction({ id, field: 'notes', value: note })}
                                                        />
                                                    </div>
                                                    <span className={cn("w-[120px] text-right font-black font-mono tabular-nums", tx.amount < 0 ? "text-slate-700" : "text-emerald-600")}>
                                                        {formatCurrency(tx.amount, settings.currency)}
                                                    </span>
                                                    <div className="w-[40px] flex justify-end opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-500"
                                                            onClick={() => {
                                                                setTransactionToSplit(tx);
                                                                setSplitModalOpen(true);
                                                            }}
                                                            title="Split / Itemize Transaction"
                                                        >
                                                            <Split className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {groupedSourceMapping.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic">
                                        <Check className="w-12 h-12 mb-3 opacity-20" />
                                        <p>All sources are mapped</p>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* 3. Pending Categorisation */}
                {pendingCategorisation.length > 0 && (
                    <AccordionItem value="pending-categorisation" className="border rounded-xl bg-card shadow-sm overflow-hidden border-amber-200">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-amber-50/50 transition-colors">
                            <div className="flex items-center justify-between w-full pr-4 text-amber-900">
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-100 p-2 rounded-lg">
                                        <Store className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold">Pending Categorisation</h3>
                                        <p className="text-xs text-amber-600/70 font-medium">Mapped sources waiting for category/sub-category</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-amber-600 text-white font-black px-3 py-1 text-sm">
                                    {pendingCategorisation.length} Pending
                                </Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-4">
                            <div className="space-y-3">
                                {groupedCategorisation.map(({ source, txs, total, avgAmount }) => {
                                    const edit = categorisationEdits[source] || { category: '', sub_category: '', status: 'Complete' };

                                    // Get categories for this source using the improved robust lists
                                    const sourceCategories = categoryList;
                                    const sourceSubCats = getSubCategoryList(edit.category || "");

                                    const handleSave = () => {
                                        if (!edit.category || !edit.sub_category) return;

                                        // Get all unique raw sources in this clean group to ensure complete automation
                                        const uniqueRawSources = Array.from(new Set(txs.map(t => t.source)));

                                        uniqueRawSources.forEach(rawName => {
                                            createRuleMutation.mutate({
                                                name: rawName,
                                                clean_source: source,
                                                category: edit.category,
                                                sub_category: edit.sub_category,
                                                auto_recurring: 'Monthly',
                                                auto_planned: true,
                                                skip_triage: true
                                            });
                                        });

                                        // Direct bulk update for current items
                                        bulkUpdate({
                                            ids: txs.map(t => t.id),
                                            updates: {
                                                category: edit.category,
                                                sub_category: edit.sub_category,
                                                confidence: 1,
                                                status: (edit.category && edit.sub_category) ? (edit.status || 'Complete') : 'Pending Triage'
                                            }
                                        });
                                    };

                                    return (
                                        <div key={source} className="flex flex-col border rounded-2xl overflow-hidden border-slate-200 bg-white hover:border-amber-300 transition-all duration-300 shadow-sm hover:shadow-md">
                                            <div className="flex items-center px-4 py-2 bg-slate-50/50">
                                                <div className="w-[200px] pr-4 flex flex-col min-w-0 shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <Store className="w-4 h-4 text-amber-400 shrink-0" />
                                                        <Badge variant="secondary" className="bg-blue-600 text-white border-blue-400 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-tight shrink-0 shadow-sm shadow-blue-200">
                                                            {source}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 pl-6">
                                                        <Badge variant="outline" className="text-[9px] font-bold h-4 bg-white px-1">{txs.length} tx</Badge>
                                                        <span className="text-[10px] font-black text-slate-900 font-mono tabular-nums">{formatCurrency(total, settings.currency)}</span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 text-[9px] font-bold text-slate-400 hover:text-blue-600 gap-1.5 p-0 bg-transparent"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/settings?tab=sources&search=${encodeURIComponent(source)}`);
                                                            }}
                                                        >
                                                            <SettingsIcon className="w-2.5 h-2.5" />
                                                            Edit
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex-1 grid grid-cols-2 gap-2">
                                                    <CategorySelector
                                                        value={edit.category || ""}
                                                        onValueChange={(v) => {
                                                            if (v.includes(':')) {
                                                                const [cat, sub] = v.split(':');
                                                                setCategorisationEdits(p => ({ ...p, [source]: { ...edit, category: cat, sub_category: sub } }));
                                                            } else {
                                                                setCategorisationEdits(p => ({ ...p, [source]: { ...edit, category: v, sub_category: '' } }));
                                                            }
                                                        }}
                                                        type="all"
                                                        suggestionLimit={3}
                                                        placeholder="Select Category"
                                                    />

                                                    <Select
                                                        value={edit.sub_category || ""}
                                                        onValueChange={(v) => setCategorisationEdits(p => ({ ...p, [source]: { ...edit, sub_category: v } }))}
                                                        disabled={!edit.category}
                                                    >
                                                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200 shadow-sm">
                                                            <SelectValue placeholder="Sub-category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {sourceSubCats.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Select
                                                    value={edit.status || ""}
                                                    onValueChange={(v) => setCategorisationEdits(p => ({ ...p, [source]: { ...edit, status: v } }))}
                                                >
                                                    <SelectTrigger className="h-9 w-[140px] text-xs bg-white border-slate-200 shadow-sm">
                                                        <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Complete">Complete</SelectItem>
                                                        <SelectItem value="Pending Reconciliation">Pending Reconciliation</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <div className="flex items-center gap-1 ml-4 shadow-sm border rounded-md overflow-hidden bg-white shrink-0">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 rounded-none disabled:opacity-30"
                                                        onClick={handleSave}
                                                        disabled={!edit.category || !edit.sub_category}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-100 rounded-none"
                                                        onClick={() => setCategorisationEdits(p => {
                                                            const next = { ...p };
                                                            delete next[source];
                                                            return next;
                                                        })}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* List of transactions in this group */}
                                            <div className="divide-y divide-slate-50 bg-white border-t border-slate-100">
                                                <div className="flex items-center px-12 py-1.5 text-[9px] uppercase font-black text-slate-400 tracking-wider">
                                                    <span className="w-[100px]">Date</span>
                                                    <span className="flex-1">Source (Raw)</span>
                                                    <span className="w-[120px] text-right">Amount</span>
                                                </div>
                                                {txs.map(tx => {
                                                    const absAmount = Math.abs(tx.amount);
                                                    const diffPercent = avgAmount > 0
                                                        ? Math.abs(absAmount - avgAmount) / avgAmount
                                                        : 0;
                                                    const isSignificant = diffPercent >= 0.05;

                                                    return (
                                                        <div key={tx.id} className="flex items-center text-[11px] px-12 py-1.5 hover:bg-amber-50/80 group/row transition-all duration-200 hover:rounded-lg mx-2">
                                                            <span className="text-slate-400 font-mono w-[100px] shrink-0">{formatDate(tx.date, userProfile?.show_time, userProfile?.date_format)}</span>
                                                            <div className="flex-1 flex items-center gap-2 min-w-0 pr-4">
                                                                <span className="text-slate-600 truncate font-medium">{tx.source}</span>
                                                                <TransactionNote
                                                                    transaction={tx}
                                                                    onSave={(id, note) => updateTransaction({ id, field: 'notes', value: note })}
                                                                />
                                                                {tx.description && tx.description !== tx.source && (
                                                                    <span className="text-[10px] text-slate-300 italic truncate ml-2">[{tx.description}]</span>
                                                                )}
                                                            </div>
                                                            <div className={cn(
                                                                "w-[120px] text-right font-bold font-mono tabular-nums flex items-center justify-end gap-1.5",
                                                                tx.amount < 0 ? "text-slate-700" : "text-emerald-600",
                                                                isSignificant && "text-amber-600 bg-amber-50 rounded px-1"
                                                            )}>
                                                                {isSignificant && (
                                                                    <span title={`Significant difference (${Math.round(diffPercent * 100)}%) from average`}>
                                                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                                    </span>
                                                                )}
                                                                {formatCurrency(tx.amount, settings.currency)}
                                                            </div>
                                                            <div className="w-[40px] flex justify-end opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-500"
                                                                    onClick={() => {
                                                                        setTransactionToSplit(tx);
                                                                        setSplitModalOpen(true);
                                                                    }}
                                                                    title="Split / Itemize Transaction"
                                                                >
                                                                    <Split className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                                {groupedCategorisation.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic">
                                        <Check className="w-12 h-12 mb-3 opacity-20" />
                                        <p>All mapped sources are categorised</p>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* 4. Pending Action - Pending Validation */}
                {pendingValidation.length > 0 && (
                    <AccordionItem value="pending-validation" className="border rounded-xl bg-card shadow-sm overflow-hidden border-lime-200">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-lime-50/50 transition-colors">
                            <div className="flex items-center justify-between w-full pr-4 text-lime-900">
                                <div className="flex items-center gap-3">
                                    <div className="bg-lime-100 p-2 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-lime-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold">Pending Action - Pending Validation</h3>
                                        <p className="text-xs text-lime-600/70 font-medium">Transactions needing review or confirmation</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="bg-lime-600 text-white font-black px-3 py-1 text-sm">
                                        {pendingValidation.length} Pending
                                    </Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-4">
                            <div className="space-y-6">
                                {/* Group by Source for easier review */}
                                {Object.entries(groupedValidation).map(([key, group]) => (
                                    <div key={key} className="space-y-3">
                                        <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10 py-2 border-b border-lime-100">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-700">{group.displayName}</h4>
                                                <Badge variant="outline" className="text-[10px]">{group.txs.length} {group.txs.length === 1 ? 'item' : 'items'}</Badge>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-[10px] font-bold text-slate-400 hover:text-blue-600 gap-1.5"
                                                    onClick={() => navigate(`/settings?tab=sources&search=${encodeURIComponent(group.displayName)}`)}
                                                >
                                                    <SettingsIcon className="w-3 h-3" />
                                                    Edit Rules
                                                </Button>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs border-lime-200 text-lime-700 hover:bg-lime-50"
                                                    onClick={() => {
                                                        // Bulk confirm all in this group
                                                        const ids = group.txs.map(t => t.id);
                                                        bulkUpdate({
                                                            ids,
                                                            updates: { status: 'Complete', confidence: 1 }
                                                        });
                                                    }}
                                                >
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Confirm All
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-lime-200 text-lime-700">
                                                            <MoreVertical className="w-3 h-3" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => {
                                                            const ids = group.txs.map(t => t.id);
                                                            bulkUpdate({
                                                                ids,
                                                                updates: { status: 'Pending Reconciliation', confidence: 1 }
                                                            });
                                                        }}>
                                                            Mark Pending Reconciliation
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            {group.txs.map(tx => (
                                                <TransactionCard key={tx.id} tx={tx} type="review" variant="lime" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* 5. Complete Transactions */}
                {auditLog.length > 0 && (
                    <AccordionItem value="audit-log" className="border rounded-xl bg-card shadow-sm overflow-hidden border-emerald-200">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-emerald-50/50 transition-colors">
                            <div className="flex items-center justify-between w-full pr-4 text-emerald-900">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-lg">
                                        <History className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold">Validated Transactions</h3>
                                        <p className="text-xs text-emerald-600/70 font-medium">Recently completed and verified transactions</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-emerald-600 text-white font-black px-3 py-1 text-sm">
                                    {auditLog.length} Completed
                                </Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-4">
                            <div className="divide-y border rounded-lg bg-white overflow-hidden border-slate-200">
                                <div className="flex items-center px-4 py-2 border-b bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    <span className="w-[100px]">Date</span>
                                    <span className="flex-1">Source</span>
                                    <span className="w-[30%]">Categorisation</span>
                                    <span className="w-[120px] text-right">Amount</span>
                                </div>
                                {(showAllAudit ? auditLog : auditLog.slice(0, 10)).map(tx => (
                                    <div key={tx.id} className="flex items-center py-2.5 px-4 hover:bg-emerald-50/80 text-xs group transition-all duration-200 hover:rounded-xl mx-2 hover:shadow-sm">
                                        <span className="text-[11px] font-mono text-slate-400 w-[100px] shrink-0">{tx.date}</span>
                                        <div className="flex-1 min-w-0 pr-4 flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-blue-600 text-white border-blue-400 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-tight shrink-0 shadow-sm shadow-blue-200">
                                                {tx.clean_source}
                                            </Badge>
                                            <TransactionNote
                                                transaction={tx}
                                                onSave={(id, note) => updateTransaction({ id, field: 'notes', value: note })}
                                            />
                                            {tx.source && tx.source !== tx.clean_source && (
                                                <span className="text-[10px] text-slate-400 italic truncate block">({tx.source})</span>
                                            )}
                                        </div>
                                        <div className="w-[30%] min-w-0 pr-4">
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] font-bold py-0 h-4 truncate max-w-full">
                                                {tx.category} {'>'} {tx.sub_category}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 w-[120px] justify-end">
                                            <span className={cn("font-black font-mono tabular-nums", tx.amount < 0 ? "text-slate-900" : "text-emerald-600")}>
                                                {formatCurrency(tx.amount, settings.currency)}
                                            </span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 text-blue-400 hover:text-blue-600 hover:bg-blue-50"
                                                    onClick={() => {
                                                        openRuleDialog(tx.clean_source || tx.source, [tx]);
                                                    }}
                                                    title="Create Automation Rule"
                                                >
                                                    <Zap className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-500"
                                                    onClick={() => {
                                                        setTransactionToSplit(tx);
                                                        setSplitModalOpen(true);
                                                    }}
                                                    title="Split / Itemize Transaction"
                                                >
                                                    <Split className="w-3.5 h-3.5" />
                                                </Button>
                                                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {auditLog.length > 10 && !showAllAudit && (
                                    <div className="p-4 flex justify-center border-t bg-slate-50/30">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowAllAudit(true)}
                                            className="text-[10px] text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-8 font-black uppercase"
                                        >
                                            ... and {auditLog.length - 10} more items (Click to expand)
                                        </Button>
                                    </div>
                                )}
                                {auditLog.length === 0 && (
                                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 italic">
                                        <Check className="w-12 h-12 mb-3 opacity-20" />
                                        <p>No completed transactions found</p>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* 6. Excluded / Deleted - SOFT DELETE BUCKET */}
                {excludedTransactions.length > 0 && (
                    <AccordionItem value="excluded" className="border rounded-xl bg-card shadow-sm overflow-hidden border-slate-200">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-100/50 transition-colors">
                            <div className="flex items-center justify-between w-full pr-4 text-slate-600">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-200 p-2 rounded-lg">
                                        <EyeOff className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold">Excluded Transactions</h3>
                                        <p className="text-xs text-slate-500 font-medium italic">Deleted and ignored items (Soft Delete)</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="bg-slate-400 text-white font-black px-3 py-1 text-sm">
                                        {excludedTransactions.length} Items
                                    </Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-4">
                            <div className="space-y-3">
                                {excludedTransactions.map(tx => (
                                    <div key={tx.id} className="flex items-center p-3 hover:bg-white transition-colors group/row border-b last:border-b-0 border-slate-200/60 opacity-60 hover:opacity-100">
                                        <div className="flex-1 flex items-center gap-4">
                                            <span className="w-[80px] text-[11px] font-mono text-slate-400 shrink-0">{tx.date}</span>
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-700 truncate block line-through decoration-slate-400">{tx.source}</span>
                                                    <TransactionNote
                                                        transaction={tx}
                                                        onSave={(id, note) => updateTransaction({ id, field: 'notes', value: note })}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400 uppercase font-black">Manually Excluded</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 w-[200px] justify-end">
                                            <span className="font-bold font-mono tabular-nums text-sm text-slate-400">
                                                {formatCurrency(tx.amount, settings.currency)}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 text-[10px] font-bold text-blue-600 hover:bg-blue-50 gap-1.5"
                                                onClick={() => {
                                                    bulkUpdate({
                                                        ids: [tx.id],
                                                        updates: { status: 'Pending Triage', excluded: false, confidence: 0 }
                                                    });
                                                }}
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                Restore
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {excludedTransactions.length === 0 && (
                                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 italic">
                                        <EyeOff className="w-12 h-12 mb-3 opacity-10" />
                                        <p>No excluded transactions found</p>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}
            </Accordion>

            {/* Rule Configuration Dialog */}
            <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Configure Rule Engine</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium pb-2 border-b">
                            Automate categorization and planning for this source across the entire budget.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <RuleForm
                            rule={selectedSourceRule}
                            setRule={setSelectedSourceRule}
                            onSave={handleSaveRule}
                            onCancel={() => setRuleDialogOpen(false)}
                            budget={budget}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {
                transactionToSplit && (
                    <TransactionSplitModal
                        open={splitModalOpen}
                        onOpenChange={(open) => {
                            setSplitModalOpen(open);
                            if (!open) setTransactionToSplit(null);
                        }}
                        transaction={transactionToSplit}
                        onSplitComplete={() => {
                            queryClient.invalidateQueries({ queryKey: ['transactions'] });
                            setSplitModalOpen(false);
                            setTransactionToSplit(null);
                        }}
                    />
                )
            }
        </div >
    );
};


