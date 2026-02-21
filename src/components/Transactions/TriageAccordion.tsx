import { useState, useMemo, useEffect } from 'react';
import { VirtualList } from '@/components/ui/virtual-list';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Check, HelpCircle, Zap, Store, History, ChevronRight, ChevronDown, ChevronUp, Edit2, Search, Split, RefreshCw, AlertTriangle, Trash2, PlusCircle, PartyPopper, Sparkles, LayoutGrid, ListFilter, Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SourceNameSelector } from './SourceNameSelector';
import { SmartSelector } from '@/components/ui/smart-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TransactionNote } from './TransactionNote';
import { Info } from 'lucide-react';

const BucketHeader = ({ fields, sortBy, sortOrder, onSort, color = "blue" }: any) => (
    <div className="flex items-center px-6 py-2 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 rounded-t-xl mb-4">
        {fields.map((f: any) => (
            <div
                key={f.key}
                className={cn(
                    "flex items-center gap-1 cursor-pointer hover:text-slate-900 transition-colors px-2 py-1 rounded",
                    f.className,
                    sortBy === f.key && `text-${color}-600 bg-${color}-50`
                )}
                onClick={() => onSort(f.key)}
            >
                {f.label}
                {sortBy === f.key && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </div>
        ))}
    </div>
);

const RuleForm = ({ rule, setRule, onSave, onCancel, getSubCategoryList }: any) => {
    const [showErrors, setShowErrors] = useState(false);
    if (!rule) return null;

    const validateAndSave = (status?: string) => {
        onSave(status);
    };

    const subCats = getSubCategoryList(rule.category);

    return (
        <div className="space-y-6">
            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Input Source Name</Label>
                    <p className="text-sm font-mono text-slate-700">{rule.name}</p>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Display Name</Label>
                    <SourceNameSelector
                        value={rule.clean_name}
                        hideAddNew={false}
                        onChange={(v) => setRule((p: any) => p ? { ...p, clean_name: v } : null)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className={cn("text-xs uppercase font-bold", showErrors && !rule.category && !rule.auto_exclude ? "text-red-500" : "text-slate-500")}>Category</Label>
                    <CategorySelector
                        value={rule.category}
                        onValueChange={(v) => {
                            if (v.includes(':')) {
                                const [cat, sub] = v.split(':');
                                setRule((p: any) => ({ ...p, category: cat, sub_category: sub }));
                            } else {
                                setRule((p: any) => ({ ...p, category: v, sub_category: '' }));
                            }
                        }}
                        disabled={rule.auto_exclude}
                        type="all"
                        suggestionLimit={3}
                        placeholder="Select category"
                        className={cn("bg-white", showErrors && !rule.category && !rule.auto_exclude && "border-red-500 ring-1 ring-red-500")}
                    />
                </div>
                <div className="space-y-2">
                    <Label className={cn("text-xs uppercase font-bold", showErrors && !rule.sub_category && !rule.auto_exclude ? "text-red-500" : "text-slate-500")}>Sub-category</Label>
                    <SmartSelector
                        value={rule.sub_category}
                        onValueChange={(v) => setRule((p: any) => ({ ...p, sub_category: v }))}
                        disabled={!rule.category || rule.auto_exclude}
                        options={subCats.map((s: string) => ({ label: s, value: s }))}
                        placeholder="..."
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2 border rounded bg-white">
                    <Label className="text-xs uppercase font-bold text-slate-500">Exclude Rule</Label>
                    <Switch checked={rule.auto_exclude} onCheckedChange={(v) => setRule((p: any) => ({ ...p, auto_exclude: v }))} />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button
                    onClick={() => validateAndSave('Pending Reconciliation')}
                    className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-bold h-10 px-6 text-sm flex items-center gap-2"
                >
                    <History className="w-4 h-4" />
                    Recon
                </Button>
                <Button onClick={() => validateAndSave()} className="bg-blue-600 hover:bg-blue-700 font-bold">Apply Rule</Button>
            </div>
        </div>
    );
};

interface TriageAccordionProps {
    transactions: any[];
    onVerifySingle: (tx: any, category?: string, sub_category?: string | null) => void;
    onSaveRule: (rule: any) => void;
    onBulkUpdate: (ids: string[], updates: any) => void;
    onSplit: (tx: any) => void;
    categoryList: string[];
    getSubCategoryList: (cat: string) => string[];
    onDelete?: (id: string) => void;
    onBulkDelete?: (ids: string[]) => void;
    onKeep?: (id: string) => void;
    onUpdateRow?: (id: string, updates: any) => void;
    mode?: 'dashboard' | 'import';
}

export const TriageAccordion = ({
    transactions,
    onVerifySingle,
    onSaveRule,
    onBulkUpdate,
    onSplit,
    categoryList,
    getSubCategoryList,
    onDelete,
    onBulkDelete,
    onKeep,
    onUpdateRow,
    mode = 'dashboard'
}: TriageAccordionProps) => {
    const { settings } = useSettings();
    const { userProfile } = useProfile();
    const [expandedSource, setExpandedSource] = useState<string | null>(null);
    const [selectedSourceRule, setSelectedSourceRule] = useState<any | null>(null);
    const [categorisationEdits, setCategorisationEdits] = useState<Record<string, { category: string, sub_category: string, status?: string }>>({});
    const [showAllAudit, setShowAllAudit] = useState(false);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
    const [confirmingKeepGroupId, setConfirmingKeepGroupId] = useState<string | null>(null);
    const [confirmingDeleteAllDuplicates, setConfirmingDeleteAllDuplicates] = useState(false);
    const [currentBucket, setCurrentBucket] = useState<string | undefined>(undefined);
    const [expandedValidationSource, setExpandedValidationSource] = useState<string | null>(null);
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingState, setEditingState] = useState<{ category: string, sub_category: string, excluded: boolean, planned: boolean }>({ category: '', sub_category: '', excluded: false, planned: true });

    const [mappingSort, setMappingSort] = useState({ field: 'total', order: 'desc' });
    const [catSort, setCatSort] = useState({ field: 'total', order: 'desc' });
    const [valSort, setValSort] = useState({ field: 'total', order: 'desc' });
    const [auditSort, setAuditSort] = useState({ field: 'total', order: 'desc' });

    // Lazy loading state: tracks how many items to show per group ID (sourceName)
    const [lazyLoadCounts, setLazyLoadCounts] = useState<Record<string, number>>({});
    const PAGE_SIZE = 20;

    const handleSort = (bucket: string, field: string) => {
        const setters: any = {
            'pending-source': [mappingSort, setMappingSort],
            'pending-categorisation': [catSort, setCatSort],
            'pending-validation': [valSort, setValSort],
            'audit-log': [auditSort, setAuditSort],
            'auto-completed': [auditSort, setAuditSort]
        };
        const [current, setter] = setters[bucket];
        if (current.field === field) {
            setter({ field, order: current.order === 'asc' ? 'desc' : 'asc' });
        } else {
            setter({ field, order: 'desc' });
        }
    };

    // 1. Separate into buckets
    const duplicateGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        transactions.forEach((tx, idx) => {
            const key = `${tx.date}_${tx.amount}_${tx.source}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push({ ...tx, _importIdx: idx });
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

    const auditLog = useMemo(() =>
        transactions.filter(tx => tx.status === 'Complete' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    const pendingSourceMapping = useMemo(() =>
        // confidence <= 0 means source unknown
        transactions.filter(tx => (!tx.confidence || tx.confidence <= 0) && tx.status !== 'Complete' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    const pendingCategorisation = useMemo(() =>
        // confidence > 0 but missing cat/subcat
        transactions.filter(tx => tx.confidence > 0 && (!tx.category || !tx.sub_category) && tx.status !== 'Complete' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    const pendingValidation = useMemo(() =>
        // confidence > 0 and has cat/subcat - hidden if 'Pending Reconciliation' or 'Complete'
        transactions.filter(tx => tx.confidence > 0 && tx.category && tx.sub_category && tx.status !== 'Complete' && tx.status !== 'Pending Reconciliation' && !duplicateIds.has(tx.id)),
        [transactions, duplicateIds]);

    const groupedAuditLog = useMemo(() => {
        const groups: Record<string, any[]> = {};
        auditLog.forEach(tx => {
            const m = tx.clean_source || tx.source;
            if (!groups[m]) groups[m] = [];
            groups[m].push(tx);
        });
        return Object.entries(groups).map(([source, txs]) => ({
            source,
            txs,
            count: txs.length,
            total: txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
        })).sort((a, b) => {
            const factor = auditSort.order === 'asc' ? 1 : -1;
            if (auditSort.field === 'source') return factor * a.source.localeCompare(b.source);
            if (auditSort.field === 'count') return factor * (a.count - b.count);
            return factor * (a.total - b.total);
        });
    }, [auditLog, auditSort]);

    // Grouping Logics
    const groupedSourceMapping = useMemo(() => {
        const groups: Record<string, any[]> = {};
        pendingSourceMapping.forEach(tx => {
            if (!groups[tx.source]) groups[tx.source] = [];
            groups[tx.source].push(tx);
        });
        return Object.entries(groups).map(([source, txs]) => ({
            source,
            txs,
            count: txs.length,
            total: txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
            avgAmount: txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / txs.length
        })).sort((a, b) => {
            const factor = mappingSort.order === 'asc' ? 1 : -1;
            if (mappingSort.field === 'source') return factor * a.source.localeCompare(b.source);
            if (mappingSort.field === 'count') return factor * (a.count - b.count);
            return factor * (a.total - b.total);
        });
    }, [pendingSourceMapping, mappingSort]);

    const groupedCategorisation = useMemo(() => {
        const groups: Record<string, any[]> = {};
        pendingCategorisation.forEach(tx => {
            const m = tx.clean_source || tx.source;
            if (!groups[m]) groups[m] = [];
            groups[m].push(tx);
        });
        return Object.entries(groups).map(([source, txs]) => ({
            source,
            txs,
            count: txs.length,
            total: txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
            avgAmount: txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / txs.length
        })).sort((a, b) => {
            const factor = catSort.order === 'asc' ? 1 : -1;
            if (catSort.field === 'source') return factor * a.source.localeCompare(b.source);
            if (catSort.field === 'count') return factor * (a.count - b.count);
            return factor * (a.total - b.total);
        });
    }, [pendingCategorisation, catSort]);

    const validationGroups = useMemo(() => {
        const sources: Record<string, any> = {};
        pendingValidation.forEach(tx => {
            const m = tx.clean_source || tx.source;
            if (!sources[m]) sources[m] = { sourceName: m, total: 0, categories: {} };
            const mObj = sources[m];
            mObj.total += Math.abs(tx.amount);

            if (!mObj.categories[tx.category]) mObj.categories[tx.category] = { catName: tx.category, total: 0, subCategories: {} };
            const cObj = mObj.categories[tx.category];
            cObj.total += Math.abs(tx.amount);

            if (!cObj.subCategories[tx.sub_category]) cObj.subCategories[tx.sub_category] = { subCatName: tx.sub_category, txs: [] };
            cObj.subCategories[tx.sub_category].txs.push(tx);
        });
        return Object.values(sources).sort((a: any, b: any) => b.total - a.total);
    }, [pendingValidation]);

    // Track the first source of the current validation groups to auto-expand if needed
    useMemo(() => {
        if (!expandedValidationSource && validationGroups.length > 0 && currentBucket === 'pending-validation') {
            const firstGroup = validationGroups[0];
            const count = firstGroup.txCount || firstGroup.txs?.length ||
                Object.values(firstGroup.categories).reduce((acc: any, cat: any) =>
                    acc + Object.values(cat.subCategories).reduce((subAcc: any, sub: any) => subAcc + sub.txs.length, 0), 0);

            // Only auto-expand if reasonably small to prevent crash on massive groups
            if (count <= 20) {
                setExpandedValidationSource(firstGroup.sourceName);
            }
        }
    }, [validationGroups, currentBucket, expandedValidationSource]);

    const openRuleDialog = (sourceName: string, txs: any[], inline: boolean = false) => {
        setSelectedSourceRule({
            name: txs[0]?.source || sourceName,
            clean_name: txs[0]?.clean_source || '',
            category: txs[0]?.category || '',
            sub_category: txs[0]?.sub_category || '',
            auto_recurring: txs[0]?.recurring || 'Monthly',
            auto_planned: txs[0]?.planned !== undefined ? txs[0]?.planned : true,
            auto_exclude: txs[0]?.excluded || false,
            transactionIds: txs.map(t => t.id)
        });
        if (inline) setExpandedSource(txs[0].id);
    };

    const handleSaveRuleInternal = (status?: string) => {
        if (typeof status === 'string') {
            onSaveRule({ ...selectedSourceRule, overrideStatus: status });
        } else {
            onSaveRule(selectedSourceRule);
        }
        setExpandedSource(null);
    };

    const handleDeleteAllDuplicates = () => {
        const idsToDelete: string[] = [];
        duplicateGroups.forEach(group => {
            const sorted = [...group].sort((a, b) => {
                const aHasInfo = (a.category && a.sub_category) ? 1 : 0;
                const bHasInfo = (b.category && b.sub_category) ? 1 : 0;
                if (aHasInfo !== bHasInfo) return bHasInfo - aHasInfo;

                const aComplete = a.status === 'Complete' ? 1 : 0;
                const bComplete = b.status === 'Complete' ? 1 : 0;
                if (aComplete !== bComplete) return bComplete - aComplete;

                const aTime = a.created_at ? new Date(a.created_at).getTime() : (a._importIdx || 0);
                const bTime = b.created_at ? new Date(b.created_at).getTime() : (b._importIdx || 0);
                return bTime - aTime; // Newer first
            });

            const toKeep = sorted[0];
            group.forEach(tx => {
                if (tx.id !== toKeep.id) idsToDelete.push(tx.id);
            });
        });
        if (idsToDelete.length > 0) {
            if (onBulkDelete) {
                onBulkDelete(idsToDelete);
            } else if (onDelete) {
                idsToDelete.forEach(id => onDelete(id));
            }
        }
        setConfirmingDeleteAllDuplicates(false);
    };

    const handleVerifyAllInGroup = (group: any, targetStatus: string = 'Complete') => {
        const ids: string[] = [];
        Object.values(group.categories).forEach((cat: any) => {
            Object.values(cat.subCategories).forEach((sub: any) => {
                ids.push(...sub.txs.map((t: any) => t.id));
            });
        });
        if (ids.length > 0) {
            onBulkUpdate(ids, { status: targetStatus });

            const currentIndex = validationGroups.findIndex(g => g.sourceName === group.sourceName);
            if (currentIndex < validationGroups.length - 1) {
                setExpandedValidationSource(validationGroups[currentIndex + 1].sourceName);
            } else {
                if (pendingSourceMapping.length > 0) setCurrentBucket('pending-source');
                else if (pendingCategorisation.length > 0) setCurrentBucket('pending-categorisation');
                else if (duplicateGroups.length > 0) setCurrentBucket('potential-duplicates');
            }
        }
    };

    const buckets = [
        {
            id: 'pending-source',
            title: 'Pending Source Mapping',
            description: 'Transactions with missing source rules',
            count: pendingSourceMapping.length,
            icon: HelpCircle,
            color: 'amber',
            content: (
                <div className="space-y-4">
                    <BucketHeader
                        fields={[
                            { label: "Source", key: "source", className: "flex-1" },
                            { label: "Count", key: "count", className: "w-24 text-center" },
                            { label: "Total Amount", key: "total", className: "w-32 text-right" }
                        ]}
                        sortBy={mappingSort.field}
                        sortOrder={mappingSort.order}
                        onSort={(f: string) => handleSort('pending-source', f)}
                        color="amber"
                    />
                    <VirtualList
                        items={groupedSourceMapping}
                        height="600px"
                        estimateSize={80}
                        className="pr-2"
                        renderItem={(item) => {
                            const { source, txs, total, avgAmount } = item;
                            return (
                                <div key={source} className="flex flex-col border rounded-lg overflow-hidden border-slate-200 bg-white hover:border-amber-300 transition-colors shadow-sm">
                                    <div className="flex items-center px-4 py-3 bg-slate-50/50 justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                                                <HelpCircle className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <h3 className="font-black text-slate-900 text-[15px] truncate tracking-tight">{source}</h3>
                                            <Badge variant="outline" className="text-[12px] h-7 bg-white border-slate-200 text-slate-500 font-bold px-3">{txs.length} {txs.length === 1 ? 'tx' : 'txs'}</Badge>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-[15px] font-black text-slate-700">{formatCurrency(total, settings.currency)}</span>
                                            <Button size="sm" onClick={() => openRuleDialog(source, txs, true)} className="bg-amber-600 hover:bg-amber-700 h-9 px-6 font-bold text-sm">Resolve</Button>
                                        </div>
                                    </div>
                                    {expandedSource === txs[0]?.id && (
                                        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                                            <RuleForm
                                                rule={selectedSourceRule}
                                                setRule={setSelectedSourceRule}
                                                onSave={handleSaveRuleInternal}
                                                onCancel={() => setExpandedSource(null)}
                                                getSubCategoryList={getSubCategoryList}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        }}
                    />
                </div>
            )
        },
        {
            id: 'pending-categorisation',
            title: 'Pending Categorisation',
            description: 'Mapped sources waiting for category/sub-category',
            count: pendingCategorisation.length,
            icon: Store,
            color: 'blue',
            content: (
                <div className="space-y-3">
                    <BucketHeader
                        fields={[
                            { label: "Source", key: "source", className: "flex-1" },
                            { label: "Count", key: "count", className: "w-24 text-center" },
                            { label: "Total Volume", key: "total", className: "w-32 text-right" }
                        ]}
                        sortBy={catSort.field}
                        sortOrder={catSort.order}
                        onSort={(f: string) => handleSort('pending-categorisation', f)}
                        color="blue"
                    />
                    <VirtualList
                        items={groupedCategorisation}
                        height="600px"
                        estimateSize={80}
                        className="pr-2"
                        renderItem={(item) => {
                            const { source, txs, total } = item;
                            const firstTx = txs[0];
                            const defaultCat = firstTx?.suggested_category || '';
                            const defaultSub = firstTx?.suggested_sub_category || '';
                            const edit = categorisationEdits[source] || { category: defaultCat, sub_category: defaultSub, status: 'Complete' };
                            const subCats = getSubCategoryList(edit.category);
                            return (
                                <div key={source} className="flex flex-col border rounded-lg overflow-hidden border-slate-200 bg-white shadow-sm hover:border-blue-300 transition-colors">
                                    <div className="flex items-center px-4 py-3 bg-slate-50 justify-between gap-6">
                                        <div className="flex-1 min-w-0 flex items-center gap-4">
                                            <span className="font-black text-slate-900 text-[15px] truncate">{source}</span>
                                            <span className="font-mono text-sm font-bold text-slate-400 shrink-0">{formatCurrency(total, settings.currency)}</span>
                                        </div>
                                        <div className="flex gap-3 items-center">
                                            <CategorySelector
                                                value={edit.category}
                                                onValueChange={v => {
                                                    if (v.includes(':')) {
                                                        const [cat, sub] = v.split(':');
                                                        setCategorisationEdits(p => ({ ...p, [source]: { ...p[source], category: cat, sub_category: sub } }));
                                                    } else {
                                                        setCategorisationEdits(p => ({ ...p, [source]: { ...p[source], category: v, sub_category: '' } }));
                                                    }
                                                }}
                                                type="all"
                                                suggestionLimit={3}
                                                placeholder="Category"
                                                className="h-10 w-[240px] text-sm font-medium"
                                            />
                                            <SmartSelector
                                                value={edit.sub_category}
                                                onValueChange={v => setCategorisationEdits(p => ({ ...p, [source]: { ...p[source], sub_category: v } }))}
                                                disabled={!edit.category}
                                                options={subCats.map(s => ({ label: s, value: s }))}
                                                placeholder="Sub-category"
                                                className="h-10 w-[200px]"
                                            />
                                            <Select
                                                value={edit.status || 'Complete'}
                                                onValueChange={v => setCategorisationEdits(p => ({ ...p, [source]: { ...p[source], status: v } }))}
                                            >
                                                <SelectTrigger className="h-10 w-[160px] bg-slate-50 border-slate-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Complete">Complete</SelectItem>
                                                    <SelectItem value="Pending Reconciliation">Pending Reconciliation</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button size="sm" className="h-10 bg-blue-600 hover:bg-blue-700 px-8 font-black text-sm uppercase tracking-tight" onClick={() => onBulkUpdate(txs.map(t => t.id), { category: edit.category, sub_category: edit.sub_category, status: (edit.category && edit.sub_category) ? (edit.status || 'Complete') : 'Pending Triage' })}>SAVE ACTIONS</Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }}
                    />
                </div>
            )
        },
        {
            id: 'pending-validation',
            title: 'Pending Validation',
            description: 'Transactions needing review or confirmation',
            count: pendingValidation.length,
            icon: Zap,
            color: 'indigo',
            content: (
                <div className="space-y-6">
                    <BucketHeader
                        fields={[
                            { label: "Source Group", key: "source", className: "flex-1" },
                            { label: "Items", key: "count", className: "w-24 text-center" },
                            { label: "Sum", key: "total", className: "w-32 text-right" }
                        ]}
                        sortBy={valSort.field}
                        sortOrder={valSort.order}
                        onSort={(f: string) => handleSort('pending-validation', f)}
                        color="indigo"
                    />
                    <Accordion
                        type="single"
                        collapsible
                        value={expandedValidationSource || ""}
                        onValueChange={setExpandedValidationSource}
                    >
                        <VirtualList
                            items={validationGroups}
                            height="600px"
                            estimateSize={80}
                            className="pr-2"
                            renderItem={(group) => (
                                <div className="pb-4">
                                    <AccordionItem key={group.sourceName} value={group.sourceName} className="border rounded-xl bg-white overflow-hidden border-slate-200 hover:border-indigo-300 transition-colors">
                                        <AccordionTrigger className="bg-slate-50 border-b border-slate-100 px-6 py-3 hover:no-underline group/trigger">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-indigo-100 rounded-lg group-hover/trigger:bg-indigo-200 transition-colors">
                                                        <Zap className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <h4 className="text-[15px] font-black text-slate-900 uppercase tracking-tight">{group.sourceName}</h4>
                                                    <Badge variant="outline" className="text-[12px] h-7 font-bold text-slate-500 bg-white border-slate-200 px-3">
                                                        {group.txCount || group.txs?.length || "?"} {(group.txCount || group.txs?.length) === 1 ? 'match' : 'matches'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <span className="font-black text-slate-900 text-[16px] font-mono tabular-nums">{formatCurrency(group.total, settings.currency)}</span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0">
                                            <div className="p-6 space-y-6 bg-slate-50/20">
                                                <div className="flex justify-center items-center gap-3 border-b border-slate-100/50 pb-5 mb-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm h-11 px-10 shadow-lg shadow-emerald-900/10 border-none tracking-tight rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleVerifyAllInGroup(group, 'Complete');
                                                        }}
                                                    >
                                                        <Check className="w-5 h-5 mr-2" />
                                                        Validate All (Complete)
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="bg-white hover:bg-amber-50 text-amber-600 border-amber-200 font-bold text-sm h-11 px-4 shadow-sm transition-all flex items-center gap-2 rounded-xl"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleVerifyAllInGroup(group, 'Pending Reconciliation');
                                                        }}
                                                    >
                                                        <History className="w-4 h-4" />
                                                        Pending Recon
                                                    </Button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="bg-white hover:bg-slate-50 text-slate-600 border-slate-200 font-bold text-sm h-11 w-11 p-0 rounded-xl shadow-sm transition-all"
                                                            >
                                                                <ChevronDown className="w-5 h-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[240px]">
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleVerifyAllInGroup(group, 'Pending Reconciliation');
                                                                }}
                                                                className="font-bold text-slate-700 py-3"
                                                            >
                                                                <History className="w-4 h-4 mr-3" />
                                                                Mark Pending Reconciliation
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                <div className="space-y-6">
                                                    {(() => {
                                                        // Flatten transactions for this group to manage pagination
                                                        // We reconstruct the hierarchy for visual display but strictly limited by count
                                                        const visibleLimit = lazyLoadCounts[group.sourceName] || PAGE_SIZE;

                                                        // Flatten to a list of renderable items (headers + transactions) or just track counts?
                                                        // Simpler: Just limit the TOTAL number of transactions rendered across all categories/subcategories.

                                                        let renderedCount = 0;
                                                        let showMoreAvailable = false;

                                                        return (
                                                            <>
                                                                {Object.values(group.categories).map((cat: any) => (
                                                                    <div key={cat.catName} className="pl-4 border-l-[3px] border-indigo-100/50 space-y-4">
                                                                        {Object.values(cat.subCategories).map((sub: any) => {
                                                                            // Calculate how many we can still render
                                                                            const remainingQuota = visibleLimit - renderedCount;
                                                                            if (remainingQuota <= 0) {
                                                                                showMoreAvailable = true;
                                                                                return null;
                                                                            }

                                                                            const txsToRender = sub.txs.slice(0, remainingQuota);
                                                                            if (sub.txs.length > remainingQuota) showMoreAvailable = true;

                                                                            renderedCount += txsToRender.length;

                                                                            if (txsToRender.length === 0) return null;

                                                                            return (
                                                                                <div key={sub.subCatName} className="space-y-2">
                                                                                    {txsToRender.map((tx: any) => (
                                                                                        <div key={tx.id} className="relative z-0 group/card-wrapper w-full mb-2">
                                                                                            <Card
                                                                                                className={cn("p-0 hover:shadow-lg transition-all bg-white border-slate-200 overflow-hidden group/card shadow-sm border-slate-200/80 cursor-pointer relative z-10", expandedSource === tx.id ? "rounded-t-xl rounded-b-none border-b-0 shadow-md ring-2 ring-indigo-500/20" : "rounded-xl")}
                                                                                                onClick={() => {
                                                                                                    if (expandedSource === tx.id) {
                                                                                                        setExpandedSource(null);
                                                                                                    } else {
                                                                                                        setSelectedSourceRule({
                                                                                                            id: 'new',
                                                                                                            source_string: tx.source || tx.clean_source,
                                                                                                            rule_type: 'exact',
                                                                                                            category: tx.category || '',
                                                                                                            sub_category: tx.sub_category || '',
                                                                                                        });
                                                                                                        setExpandedSource(tx.id);
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <div className="flex items-center h-14">
                                                                                                    <div
                                                                                                        className="w-[28%] min-w-0 px-5 h-full flex flex-col justify-center border-r border-slate-50 group-hover/card:bg-indigo-50/40 transition-colors"
                                                                                                        title="Click to Edit Source Mapping"
                                                                                                    >
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <div className="font-black text-[14px] text-slate-900 leading-tight truncate hover:text-indigo-600 transition-colors" title={tx.clean_source || tx.source}>
                                                                                                                {tx.clean_source || tx.source}
                                                                                                            </div>
                                                                                                            {onUpdateRow && (
                                                                                                                <TransactionNote
                                                                                                                    transaction={tx}
                                                                                                                    onSave={(id, note) => onUpdateRow(id, { notes: note })}
                                                                                                                />
                                                                                                            )}
                                                                                                        </div>
                                                                                                        {tx.clean_source && tx.clean_source !== tx.source && (
                                                                                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate mt-0.5">
                                                                                                                {tx.source}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>

                                                                                                    <div className="flex-1 flex items-center px-6 h-full gap-8 bg-slate-50/5">
                                                                                                        <div className="flex items-center gap-4 shrink-0">
                                                                                                            <span className={cn(
                                                                                                                "text-[10px] font-black uppercase tracking-wider tabular-nums leading-none",
                                                                                                                tx.needs_date_verification ? "text-amber-600 flex items-center gap-1" : "text-slate-400"
                                                                                                            )}>
                                                                                                                {tx.needs_date_verification && <AlertTriangle className="w-3 h-3" />}
                                                                                                                {formatDate(tx.date, userProfile?.show_time, userProfile?.date_format)}
                                                                                                            </span>
                                                                                                            {editingRowId === tx.id ? (
                                                                                                                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                                                                                                    <CategorySelector
                                                                                                                        value={editingState.category}
                                                                                                                        onValueChange={(v) => {
                                                                                                                            if (v.includes(':')) {
                                                                                                                                const [cat, sub] = v.split(':');
                                                                                                                                setEditingState(p => ({ ...p, category: cat, sub_category: sub }));
                                                                                                                            } else {
                                                                                                                                setEditingState(p => ({ ...p, category: v }));
                                                                                                                            }
                                                                                                                        }}
                                                                                                                        type="all"
                                                                                                                        className="h-7 text-xs w-32"
                                                                                                                        placeholder="Category"
                                                                                                                    />
                                                                                                                    <SmartSelector
                                                                                                                        value={editingState.sub_category}
                                                                                                                        onValueChange={(v) => setEditingState(p => ({ ...p, sub_category: v }))}
                                                                                                                        options={getSubCategoryList(editingState.category).map((s: string) => ({ label: s, value: s }))}
                                                                                                                        disabled={!editingState.category}
                                                                                                                        placeholder="Sub"
                                                                                                                        className="h-7 text-xs w-32"
                                                                                                                    />
                                                                                                                    <div className="flex items-center gap-2 px-2 border-l border-slate-200">
                                                                                                                        <div className="flex items-center gap-1.5">
                                                                                                                            <Label className="text-[10px] uppercase font-bold text-slate-500 cursor-pointer" htmlFor={`exclude-${tx.id}`}>Exclude</Label>
                                                                                                                            <Switch id={`exclude-${tx.id}`} className="scale-75" checked={editingState.excluded} onCheckedChange={(v) => setEditingState(p => ({ ...p, excluded: v }))} />
                                                                                                                        </div>
                                                                                                                        <div className="flex items-center gap-1.5 ml-1">
                                                                                                                            <Label className="text-[10px] uppercase font-bold text-slate-500 cursor-pointer" htmlFor={`unplanned-${tx.id}`}>Unplanned</Label>
                                                                                                                            <Switch id={`unplanned-${tx.id}`} className="scale-75" checked={!editingState.planned} onCheckedChange={(v) => setEditingState(p => ({ ...p, planned: !v }))} />
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                    <Button
                                                                                                                        size="sm"
                                                                                                                        className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700 ml-1"
                                                                                                                        onClick={(e) => {
                                                                                                                            e.stopPropagation();
                                                                                                                            if (onUpdateRow) {
                                                                                                                                onUpdateRow(tx.id, {
                                                                                                                                    category: editingState.category,
                                                                                                                                    sub_category: editingState.sub_category,
                                                                                                                                    excluded: editingState.excluded,
                                                                                                                                    planned: editingState.planned,
                                                                                                                                    // If manually edited, we treat it as Explicit/verified
                                                                                                                                    status: (editingState.category && editingState.sub_category) ? 'Complete' : 'Pending Triage'
                                                                                                                                });
                                                                                                                            }
                                                                                                                            setEditingRowId(null);
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <Check className="w-3.5 h-3.5" />
                                                                                                                    </Button>
                                                                                                                    <Button
                                                                                                                        size="sm"
                                                                                                                        variant="ghost"
                                                                                                                        className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                                                                                                                        onClick={(e) => {
                                                                                                                            e.stopPropagation();
                                                                                                                            setEditingRowId(null);
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <X className="w-3.5 h-3.5" />
                                                                                                                    </Button>
                                                                                                                </div>
                                                                                                            ) : (
                                                                                                                <Badge
                                                                                                                    variant="secondary"
                                                                                                                    className="text-[10px] h-6 px-3 bg-white text-slate-600 border border-slate-200/80 font-black tracking-tight shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all group/badge"
                                                                                                                    onClick={(e) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        setEditingRowId(tx.id);
                                                                                                                        setEditingState({ category: tx.category || '', sub_category: tx.sub_category || '', excluded: tx.excluded || false, planned: tx.planned !== false });
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <Tag className="w-3 h-3 opacity-40 group-hover/badge:text-blue-500" />
                                                                                                                    {tx.category} <ChevronRight className="w-2.5 h-2.5 opacity-30" /> {tx.sub_category}
                                                                                                                    <Edit2 className="w-3 h-3 ml-1 opacity-0 group-hover/badge:opacity-100 transition-opacity" />
                                                                                                                </Badge>
                                                                                                            )}
                                                                                                        </div>

                                                                                                        <div className="flex-1 text-right border-l border-slate-100 pl-6">
                                                                                                            <span className={cn(
                                                                                                                "font-mono tabular-nums text-[16px] font-black tracking-tighter",
                                                                                                                tx.amount < 0 ? "text-slate-900" : "text-emerald-600"
                                                                                                            )}>
                                                                                                                {formatCurrency(tx.amount, settings.currency)}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div className="w-fit flex items-center gap-2 shrink-0 px-4 h-full border-l border-slate-50 bg-white">
                                                                                                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSplit(tx); }} className="h-9 w-9 p-0 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-lg" title="Split Transaction"><Split className="w-4 h-4" /></Button>
                                                                                                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onVerifySingle(tx); }} className="h-9 w-9 p-0 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100/50 transition-all rounded-lg" title="Verify Transaction"><Check className="w-5 h-5" /></Button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </Card>
                                                                                            {expandedSource === tx.id && (
                                                                                                <div className="p-6 border-x border-b border-slate-200 bg-slate-50/50 shadow-inner rounded-b-xl -mt-2 animate-in slide-in-from-top-2 duration-200">
                                                                                                    <RuleForm
                                                                                                        rule={selectedSourceRule}
                                                                                                        setRule={setSelectedSourceRule}
                                                                                                        onSave={handleSaveRuleInternal}
                                                                                                        onCancel={() => setExpandedSource(null)}
                                                                                                        getSubCategoryList={getSubCategoryList}
                                                                                                    />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ))}

                                                                {showMoreAvailable && (
                                                                    <div className="flex justify-center pt-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => setLazyLoadCounts(prev => ({
                                                                                ...prev,
                                                                                [group.sourceName]: (prev[group.sourceName] || PAGE_SIZE) + PAGE_SIZE
                                                                            }))}
                                                                            className="text-slate-500 hover:text-indigo-600 border-dashed border-slate-300 hover:border-indigo-300"
                                                                        >
                                                                            Show More Transactions
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </div>
                            )}
                        />
                    </Accordion>
                </div>
            )
        }
    ];

    const duplicateBucket = {
        id: 'potential-duplicates',
        title: 'Potential Duplicates',
        description: 'Review same date/amount/source items',
        count: duplicateGroups.length,
        icon: AlertTriangle,
        color: 'rose',
        content: (
            <div className="space-y-4">
                {duplicateGroups.map((group, idx) => (
                    <div key={idx} className="border rounded-xl overflow-hidden border-slate-200 bg-white shadow-sm hover:border-rose-300 transition-colors">
                        <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex justify-between items-center text-[11px] uppercase font-black text-slate-400">
                            <span className="flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                Review Group {idx + 1}
                            </span>
                            {onKeep && (
                                <Button
                                    size="sm"
                                    variant={confirmingKeepGroupId === `group-${idx}` ? "default" : "ghost"}
                                    className={cn(
                                        "h-8 px-4 text-[11px] font-bold transition-all rounded-lg",
                                        confirmingKeepGroupId === `group-${idx}`
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                            : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirmingKeepGroupId === `group-${idx}`) {
                                            const toDifferentiate = group.find(t => t.status !== 'Complete') || group[1] || group[0];
                                            if (toDifferentiate) onKeep(toDifferentiate.id);
                                            setConfirmingKeepGroupId(null);
                                        } else {
                                            setConfirmingKeepGroupId(`group-${idx}`);
                                            setTimeout(() => setConfirmingKeepGroupId(prev => prev === `group-${idx}` ? null : prev), 3000);
                                        }
                                    }}
                                >
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    {confirmingKeepGroupId === `group-${idx}` ? "CONFIRM KEEP BOTH" : "KEEP BOTH"}
                                </Button>
                            )}
                        </div>
                        {group.map(tx => (
                            <div key={tx.id} className="flex items-center h-13 bg-white hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 group/duplicate">
                                <div className="w-[28%] min-w-0 px-6 h-full flex flex-col justify-center border-r border-slate-50 group-hover/duplicate:bg-slate-50/40 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-sm text-slate-900 truncate tracking-tight">
                                            {tx.clean_source || tx.source}
                                        </div>
                                        {onUpdateRow && (
                                            <TransactionNote
                                                transaction={tx}
                                                onSave={(id, note) => onUpdateRow(id, { notes: note })}
                                            />
                                        )}
                                    </div>
                                    <div className={cn(
                                        "text-[10px] tabular-nums font-black uppercase tracking-tighter mt-0.5",
                                        tx.needs_date_verification ? "text-amber-600 flex items-center gap-1" : "text-slate-400"
                                    )}>
                                        {tx.needs_date_verification && <AlertTriangle className="w-2.5 h-2.5" />}
                                        {formatDate(tx.date, userProfile?.show_time, userProfile?.date_format)}
                                    </div>
                                </div>

                                <div className="flex-1 flex items-center px-8 h-full gap-6 bg-slate-50/10">
                                    <Badge variant="secondary" className="text-[10px] h-6 px-2 bg-white text-slate-500 uppercase font-black tracking-tight border-slate-100 shadow-xs">
                                        {tx.status}
                                    </Badge>
                                    {tx.category && (
                                        <span className="text-[12px] text-slate-600 font-medium truncate flex items-center gap-1.5 opacity-80">
                                            {tx.category} <ChevronRight className="w-3 h-3 opacity-30" /> {tx.sub_category}
                                        </span>
                                    )}
                                    <div className="flex-1 text-right">
                                        <span className={cn(
                                            "font-mono tabular-nums text-sm font-black tracking-tight",
                                            tx.amount < 0 ? "text-slate-900" : "text-emerald-600"
                                        )}>
                                            {formatCurrency(tx.amount, settings.currency)}
                                        </span>
                                    </div>
                                </div>

                                <div className="w-fit flex items-center gap-3 shrink-0 px-6 h-full border-l border-slate-50 bg-white">
                                    {onDelete && (
                                        <div className="flex items-center gap-3">
                                            {tx.status === 'Complete' && (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-none px-3 py-1 h-8 text-[10px] font-black tracking-tighter shadow-sm flex items-center gap-1.5 rounded-lg">
                                                    <Check className="w-3.5 h-3.5" /> KEEPING
                                                </Badge>
                                            )}
                                            <Button
                                                size="sm"
                                                variant={confirmingDeleteId === tx.id ? "destructive" : "ghost"}
                                                className={cn(
                                                    "transition-all duration-200 rounded-lg",
                                                    confirmingDeleteId === tx.id ? "h-9 px-4 w-auto text-xs font-bold" : "h-10 w-10 p-0 text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirmingDeleteId === tx.id) {
                                                        onDelete(tx.id);
                                                        setConfirmingDeleteId(null);
                                                    } else {
                                                        setConfirmingDeleteId(tx.id);
                                                        setTimeout(() => setConfirmingDeleteId(prev => prev === tx.id ? null : prev), 3000);
                                                    }
                                                }}
                                                title={confirmingDeleteId === tx.id ? "Click again to confirm" : "Delete Transaction"}
                                            >
                                                {confirmingDeleteId === tx.id ? "CONFIRM" : <Trash2 className="w-5 h-5" />}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        )
    };

    const completionBucket = {
        id: mode === 'import' ? 'auto-completed' : 'audit-log',
        title: mode === 'import' ? 'Validated Transactions' : 'Completed Transactions',
        description: mode === 'import' ? 'Successfully matched and labeled' : 'Previously verified items',
        count: auditLog.length,
        icon: mode === 'import' ? Check : History,
        color: 'emerald',
        content: (
            <div className="space-y-4">
                <BucketHeader
                    fields={[
                        { label: "Resolved Source", key: "source", className: "flex-1" },
                        { label: "Count", key: "count", className: "w-24 text-center" },
                        { label: "Total", key: "total", className: "w-32 text-right" }
                    ]}
                    sortBy={auditSort.field}
                    sortOrder={auditSort.order}
                    onSort={(f: string) => handleSort('audit-log', f)}
                    color="emerald"
                />
                {(showAllAudit ? groupedAuditLog : groupedAuditLog.slice(0, 10)).map(({ source, txs, total }) => (
                    <div key={source} className="flex flex-col border rounded-xl overflow-hidden border-slate-200 bg-white hover:border-emerald-300 transition-colors shadow-sm">
                        <div className="flex items-center px-4 py-3 bg-slate-50/50 justify-between">
                            <div className="flex items-center gap-4">
                                <h3 className="font-black text-slate-900 text-[15px] truncate tracking-tight uppercase leading-none">{source}</h3>
                                <Badge variant="outline" className="text-[12px] h-7 bg-white border-slate-200 text-slate-500 font-bold px-3">{txs.length} {txs.length === 1 ? 'item' : 'items'}</Badge>
                                <span className="font-black text-emerald-600 text-[15px] font-mono leading-none">{formatCurrency(total, settings.currency)}</span>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    if (expandedSource === txs[0]?.id) setExpandedSource(null);
                                    else setExpandedSource(txs[0]?.id);
                                }}
                                className="h-10 px-6 text-[12px] font-black uppercase tracking-tighter text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                            >
                                {expandedSource === txs[0]?.id ? "Hide Details" : "Show Transactions"}
                            </Button>
                        </div>
                        {expandedSource === txs[0]?.id && (
                            <div className="divide-y divide-slate-50 border-t border-slate-100 bg-white/30">
                                {txs.map(tx => (
                                    <div key={tx.id} className="flex items-center h-13 group/row hover:bg-slate-50/50 transition-colors px-4">
                                        <div className="flex-1 min-w-0 px-2 flex flex-col justify-center">
                                            <div className={cn(
                                                "text-[10px] tabular-nums font-black uppercase tracking-tighter mb-0.5",
                                                tx.needs_date_verification ? "text-amber-600 flex items-center gap-1" : "text-slate-400"
                                            )}>
                                                {tx.needs_date_verification && <AlertTriangle className="w-3 h-3" />}
                                                {formatDate(tx.date, userProfile?.show_time, userProfile?.date_format)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-[12px] text-slate-600 truncate font-semibold leading-tight">{tx.source}</div>
                                                {onUpdateRow && (
                                                    <TransactionNote
                                                        transaction={tx}
                                                        onSave={(id, note) => onUpdateRow(id, { notes: note })}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 px-4 h-full">
                                            <Badge variant="secondary" className="text-[10px] h-6.5 px-3 bg-slate-100 text-slate-600 border border-slate-200/50 font-black tracking-tight shadow-xs truncate flex items-center gap-1.5 shrink-0 opacity-80">
                                                <Tag className="w-3 h-3 opacity-40" />
                                                {tx.category} <ChevronRight className="w-2.5 h-2.5 opacity-30" /> {tx.sub_category}
                                            </Badge>
                                            <span className={cn(
                                                "font-mono tabular-nums text-[14px] font-black tracking-tight w-24 text-right",
                                                tx.amount < 0 ? "text-slate-900" : "text-emerald-600"
                                            )}>
                                                {formatCurrency(tx.amount, settings.currency)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 px-2 h-full">
                                            <Button size="sm" variant="ghost" onClick={() => onSplit(tx)} className="h-10 w-10 p-0 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg" title="Split Transaction"><Split className="w-5 h-5" /></Button>
                                            <Button size="sm" variant="ghost" onClick={() => openRuleDialog(tx.source, [tx], true)} className="h-10 w-10 p-0 text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition-all rounded-lg" title="Edit Mapping"><Edit2 className="w-5 h-5" /></Button>
                                            <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 rounded-lg">
                                                <Check className="w-5 h-5 text-emerald-600 font-black" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {groupedAuditLog.length > 10 && !showAllAudit && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setShowAllAudit(true); }}
                        className="w-full text-[11px] font-bold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-10 border border-dashed border-slate-200 mt-2 rounded-xl"
                    >
                        ... and {groupedAuditLog.length - 10} more sources (Click to show all)
                    </Button>
                )}
            </div>
        )
    };

    const sortedBuckets = useMemo(() => {
        const completion = completionBucket;
        const dups = duplicateBucket;
        let list = [];

        if (mode === 'import') {
            list = [
                dups,
                ...buckets.filter(b => b.id === 'pending-source' || b.id === 'pending-categorisation' || b.id === 'pending-validation'),
                completion
            ];
        } else {
            list = [dups, ...buckets, completion];
        }

        return list.filter(b => b.count > 0);
    }, [mode, buckets, completionBucket, duplicateBucket]);

    const allPendingEmpty = duplicateGroups.length === 0 &&
        pendingSourceMapping.length === 0 &&
        pendingCategorisation.length === 0 &&
        pendingValidation.length === 0;

    useEffect(() => {
        if (currentBucket) {
            const currentBucketObj = sortedBuckets.find(b => b.id === currentBucket);
            if (!currentBucketObj || currentBucketObj.count === 0) {
                setCurrentBucket(undefined);
            }
        }
    }, [currentBucket, sortedBuckets]);

    useMemo(() => {
        if (currentBucket !== undefined) return;

        if (mode === 'import') {
            let defaultOpen = "";
            if (auditLog.length > 0) defaultOpen = "auto-completed";
            else if (duplicateGroups.length > 0) defaultOpen = "potential-duplicates";
            else if (pendingValidation.length > 0) defaultOpen = "pending-validation";
            else if (pendingSourceMapping.length > 0) defaultOpen = "pending-source";
            else if (pendingCategorisation.length > 0) defaultOpen = "pending-categorisation";
            if (defaultOpen) setCurrentBucket(defaultOpen);
        }
        // In dashboard mode, we don't auto-open anything
    }, [mode, pendingSourceMapping.length, pendingCategorisation.length, pendingValidation.length, duplicateGroups.length, auditLog.length, currentBucket]);

    return (
        <div className="space-y-6">
            {allPendingEmpty && (
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

            {!currentBucket ? (
                <div className="grid gap-4 w-full">
                    {sortedBuckets.map(b => (
                        <Card
                            key={b.id}
                            className={cn(
                                "transition-all duration-300 group/bucket border bg-white overflow-hidden",
                                `border-${b.color}-200 hover:border-${b.color}-400`,
                                mode === 'import' ? "cursor-default shadow-sm" : "cursor-pointer hover:shadow-md"
                            )}
                            onClick={() => {
                                if (mode !== 'import') setCurrentBucket(b.id);
                            }}
                        >
                            <div className={cn("px-6 py-5 flex items-center justify-between w-full transition-colors", `text-${b.color}-900`, `group-hover/bucket:bg-${b.color}-50/40`)}>
                                <div className="flex items-center gap-4">
                                    <div className={cn("p-3 rounded-xl shadow-sm transition-all group-hover/bucket:scale-105 group-hover/bucket:shadow-md", `bg-${b.color}-100`)}>
                                        <b.icon className={cn("w-6 h-6", `text-${b.color}-600`)} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-xl font-bold tracking-tight mb-0.5">{b.title}</h3>
                                        <p className="text-sm opacity-70 font-medium">{b.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {b.id === 'potential-duplicates' && duplicateGroups.length > 0 && (
                                        <Button
                                            size="sm"
                                            variant={confirmingDeleteAllDuplicates ? "destructive" : "outline"}
                                            className={cn(
                                                "h-8 px-4 text-xs font-black tracking-tighter transition-all shadow-sm",
                                                !confirmingDeleteAllDuplicates && "text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 bg-white"
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
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            {confirmingDeleteAllDuplicates ? "CONFIRM DELETE EXTRA COPIES" : "CLEAN ALL DUPLICATES"}
                                        </Button>
                                    )}
                                    <Badge variant="secondary" className={cn("text-white font-black px-4 py-1.5 text-sm shadow-sm", `bg-${b.color}-600`)}>
                                        {b.count} {b.id === 'potential-duplicates' ? 'Groups' : 'Items'}
                                    </Badge>
                                    <ChevronRight className={cn("w-5 h-5 opacity-40 group-hover/bucket:opacity-100 group-hover/bucket:translate-x-1 transition-all", `text-${b.color}-600`)} />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col flex-1 h-[calc(100vh-100px)] min-h-[600px] bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {sortedBuckets.find(b => b.id === currentBucket) && (() => {
                        const b = sortedBuckets.find(b => b.id === currentBucket)!;
                        return (
                            <div className="flex flex-col h-full bg-slate-50/50">
                                <div className={cn("px-8 py-5 sticky top-0 z-20 border-b shadow-sm backdrop-blur-xl shrink-0", `bg-${b.color}-50/95`, `border-${b.color}-100`)}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCurrentBucket(undefined)}
                                            className={cn("-ml-2 h-8 px-2 text-[12px] font-black uppercase tracking-widest transition-colors", `text-${b.color}-600 hover:text-${b.color}-800 hover:bg-${b.color}-100`)}
                                        >
                                            <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                                            Back to Summary
                                        </Button>
                                    </div>
                                    <div className={cn("flex items-center gap-4", `text-${b.color}-900`)}>
                                        <div className={cn("p-3 rounded-xl shadow-sm", `bg-${b.color}-100`)}>
                                            <b.icon className={cn("w-7 h-7", `text-${b.color}-600`)} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight leading-none mb-1">{b.title}</h2>
                                            <p className="font-medium opacity-80 text-sm">{b.description}</p>
                                        </div>
                                        <div className="ml-auto flex items-center gap-3">
                                            <Badge variant="secondary" className={cn("text-white font-black px-4 py-1.5 text-sm shadow-sm", `bg-${b.color}-600`)}>
                                                {b.count} {b.id === 'potential-duplicates' ? 'Groups' : 'Items'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 overflow-y-auto flex-1 h-full max-h-full">
                                    {b.content}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
