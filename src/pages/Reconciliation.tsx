import { useMemo, useState } from 'react';
// Page dealing with pending transactions and offsetting matches
import { useTransactionTable, Transaction } from '@/components/Transactions/hooks/useTransactionTable';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRightLeft, X, Sparkles, History, User, Building, Briefcase, Pencil, Plus, ArrowLeft, HelpCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionDetailDialog } from '@/components/Transactions/TransactionDetailDialog';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useProfile } from '@/contexts/ProfileContext';

const MatchCard = ({ item1, item2, onMatch, onIgnore, currency, dateFormat }: {
    item1: Transaction,
    item2: Transaction,
    onMatch: () => void,
    onIgnore: () => void,
    currency: string,
    dateFormat: string
}) => {
    return (
        <Card className="mb-4 border-dashed border-2 hover:border-solid hover:border-primary/50 transition-all bg-card/50 group">
            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 space-y-2 w-full">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground">{formatDate(item1.date, false, dateFormat)}</span>
                        <div className="flex gap-1">
                            {item1.entity && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 text-[10px] uppercase font-black">{item1.entity}</Badge>}
                            <Badge variant="outline" className="text-[10px]">{item1.category}</Badge>
                        </div>
                    </div>
                    <div className="font-bold truncate text-foreground">{item1.source}</div>
                    <div className={cn("font-black text-xl tracking-tighter", item1.amount >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {formatCurrency(item1.amount, currency)}
                    </div>
                </div>

                <div className="flex md:flex-col items-center justify-center p-3 text-purple-500 bg-purple-50 rounded-full border border-purple-100 shadow-sm group-hover:scale-110 transition-transform">
                    <ArrowRightLeft className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-2 w-full text-right md:text-left">
                    <div className="flex justify-between md:flex-row-reverse items-center">
                        <span className="text-xs font-bold text-muted-foreground">{formatDate(item2.date, false, dateFormat)}</span>
                        <div className="flex gap-1">
                            {item2.entity && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 text-[10px] uppercase font-black">{item2.entity}</Badge>}
                            <Badge variant="outline" className="text-[10px]">{item2.category}</Badge>
                        </div>
                    </div>
                    <div className="font-bold truncate text-foreground">{item2.source}</div>
                    <div className={cn("font-black text-xl tracking-tighter", item2.amount >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {formatCurrency(item2.amount, currency)}
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-border/50 justify-end">
                    <Button variant="ghost" size="sm" onClick={onIgnore} className="text-muted-foreground hover:text-red-500 hover:bg-red-50">
                        <X className="w-4 h-4 mr-1" />
                        Ignore
                    </Button>
                    <Button size="sm" onClick={onMatch} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all">
                        <Check className="w-4 h-4 mr-1" />
                        Approve Match
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const Reconciliation = () => {
    const { transactions, bulkUpdate } = useTransactionTable({ mode: 'all' });
    const { settings } = useSettings();
    const { userProfile } = useProfile();
    const dateFormat = userProfile?.date_format || 'YY/MM/DD';
    const [ignoredMatches, setIgnoredMatches] = useState<Set<string>>(new Set());

    // UI states
    const [showHistory, setShowHistory] = useState(false);
    const [renamingEntity, setRenamingEntity] = useState<string | null>(null);
    const [newEntityName, setNewEntityName] = useState("");

    // Detail Dialog State
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    // Entity creation
    const [customEntities, setCustomEntities] = useState<string[]>([]);

    // Unknown Transactions Note Prompt
    const [promptingNoteTx, setPromptingNoteTx] = useState<Transaction | null>(null);
    const [triageNote, setTriageNote] = useState("");

    // Filter for Pending Reconciliation items
    const pendingItems = useMemo(() => {
        return transactions.filter(t => {
            const status = t.status || '';
            const isPending = status === 'Pending Reconciliation' ||
                status.startsWith('Pending: ') ||
                (status.startsWith('Pending ') && !['Pending Triage', 'Pending Categorisation', 'Pending Mapping', 'Pending Validation'].includes(status)) ||
                !!t.entity;
            return isPending && !t.excluded && status !== 'Reconciled';
        });
    }, [transactions]);

    // Filter for Reconciled items
    const reconciledItems = useMemo(() => {
        return transactions.filter(t => t.status === 'Reconciled');
    }, [transactions]);

    // Get all unique entities from the system
    const existingEntities = useMemo(() => {
        const entities = new Set<string>(customEntities);
        transactions.forEach(t => {
            if (t.entity) entities.add(t.entity);
        });
        return Array.from(entities).sort();
    }, [transactions, customEntities]);

    // Group reconciled items by entity and session (updated_at mapping)
    const groupedHistory = useMemo(() => {
        const groups: Record<string, Record<string, Transaction[]>> = {};

        reconciledItems.forEach(item => {
            const entity = item.entity || 'Reconciled';
            // Use updated_at as a session identifier. Quantize it to seconds to catch items from the same bulk update.
            const session = item.updated_at ? Math.floor(new Date(item.updated_at).getTime() / 1000).toString() : 'legacy';

            if (!groups[entity]) groups[entity] = {};
            if (!groups[entity][session]) groups[entity][session] = [];
            groups[entity][session].push(item);
        });

        // Sort sessions by date (descending) within each entity
        const sortedGroups: Record<string, Transaction[][]> = {};
        Object.keys(groups).forEach(entity => {
            sortedGroups[entity] = Object.values(groups[entity]).sort((a, b) => {
                const dateA = new Date(a[0].updated_at || 0).getTime();
                const dateB = new Date(b[0].updated_at || 0).getTime();
                return dateB - dateA;
            });
        });

        return sortedGroups;
    }, [reconciledItems]);

    // Group items by entity
    const groupedByEntity = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};

        customEntities.forEach(ce => {
            if (!groups[ce]) groups[ce] = [];
        });

        pendingItems.forEach(item => {
            let entity = 'Unassigned';
            if (item.entity) {
                entity = item.entity;
            } else if (item.status && item.status.startsWith('Pending: ')) {
                entity = item.status.replace('Pending: ', '');
            } else if (item.status && item.status.startsWith('Pending ') &&
                !['Pending Triage', 'Pending Categorisation', 'Pending Mapping', 'Pending Validation', 'Pending Reconciliation'].includes(item.status)) {
                entity = item.status.replace('Pending ', '');
            }

            if (entity !== 'Unassigned') {
                if (!groups[entity]) groups[entity] = [];
                groups[entity].push(item);
            }
        });
        return groups;
    }, [pendingItems, customEntities]);

    // Unknown transactions
    const unknownItems = useMemo(() => {
        return pendingItems.filter(item => {
            let entity = 'Unassigned';
            if (item.entity) {
                entity = item.entity;
            } else if (item.status && item.status.startsWith('Pending: ')) {
                entity = item.status.replace('Pending: ', '');
            } else if (item.status && item.status.startsWith('Pending ') &&
                !['Pending Triage', 'Pending Categorisation', 'Pending Mapping', 'Pending Validation', 'Pending Reconciliation'].includes(item.status)) {
                entity = item.status.replace('Pending ', '');
            }
            return entity === 'Unassigned';
        });
    }, [pendingItems]);

    // Find suggested matches 
    const suggestedMatches = useMemo(() => {
        const matches: { item1: Transaction, item2: Transaction }[] = [];
        const processedIds = new Set<string>();

        pendingItems.forEach(item => {
            if (processedIds.has(item.id) || ignoredMatches.has(item.id)) return;

            const match = pendingItems.find(t =>
                t.id !== item.id &&
                !processedIds.has(t.id) &&
                !ignoredMatches.has(t.id) &&
                Math.abs(t.amount) === Math.abs(item.amount) &&
                ((t.amount > 0 && item.amount < 0) || (t.amount < 0 && item.amount > 0)) &&
                (t.entity === item.entity || (t.status === item.status && t.status?.startsWith('Pending: ')))
            );

            if (match) {
                matches.push({ item1: item, item2: match });
                processedIds.add(item.id);
                processedIds.add(match.id);
            }
        });

        return matches;
    }, [pendingItems, ignoredMatches]);

    const handleApproveMatch = (item1: Transaction, item2: Transaction) => {
        bulkUpdate({
            ids: [item1.id, item2.id],
            updates: { status: 'Reconciled' }
        });

        toast.success("Transactions Reconciled", {
            description: `Matched ${formatCurrency(item1.amount, settings.currency)} and ${formatCurrency(item2.amount, settings.currency)}`
        });
    };

    const handleIgnoreMatch = (id1: string, id2: string) => {
        setIgnoredMatches(prev => {
            const next = new Set(prev);
            next.add(id1);
            next.add(id2);
            return next;
        });
    };

    const handleUnreconcile = (id: string, originalEntity?: string) => {
        bulkUpdate({
            ids: [id],
            updates: { status: 'Pending Reconciliation', entity: originalEntity || undefined }
        });
        toast.success("Transaction Restored", {
            description: "Moving back to outstanding items."
        });
    };

    const getEntityIcon = (entityName: string) => {
        const name = entityName.toLowerCase();
        if (name.includes('work') || name.includes('reimbersment')) return <Briefcase className="w-5 h-5 text-blue-500" />;
        if (name.includes('company') || name.includes('refund') || name.includes('support')) return <Building className="w-5 h-5 text-amber-500" />;
        return <User className="w-5 h-5 text-indigo-500" />;
    };

    const handleSaveRename = (oldName: string) => {
        setRenamingEntity(null);
        if (!newEntityName || newEntityName === oldName) {
            return;
        }

        const items = groupedByEntity[oldName] || [];

        // Update names in custom list
        setCustomEntities(prev => {
            const next = prev.filter(c => c !== oldName && c !== newEntityName);
            next.push(newEntityName);
            return next;
        });

        if (items.length > 0) {
            const ids = items.map(i => i.id);
            bulkUpdate({
                ids,
                updates: { entity: newEntityName }
            });
            toast.success("Entity Renamed", {
                description: `Renamed ${oldName} to ${newEntityName}`
            });
        }
    };

    const createNewEntity = () => {
        const name = prompt("Enter new Entity / Event name:");
        if (name && name.trim().length > 0) {
            setCustomEntities(prev => Array.from(new Set([...prev, name.trim()])));
        }
    };

    const handleSetPendingTriage = (item: Transaction) => {
        if (item.notes && item.notes.trim().length > 0) {
            bulkUpdate({
                ids: [item.id],
                updates: { status: 'Pending Triage', entity: null }
            });
            toast.success("Moved to Pending Triage");
        } else {
            setPromptingNoteTx(item);
            setTriageNote("");
        }
    };

    const submitTriageNote = () => {
        if (promptingNoteTx && triageNote.trim().length > 0) {
            bulkUpdate({
                ids: [promptingNoteTx.id],
                updates: {
                    status: 'Pending Triage',
                    entity: null,
                    notes: promptingNoteTx.notes ? `${promptingNoteTx.notes}\n${triageNote}` : triageNote
                }
            });
            toast.success("Moved to Pending Triage");
            setPromptingNoteTx(null);
            setTriageNote("");
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-32">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-[#1a1c2e] tracking-tight">Reconciliation Overview</h2>
                    <p className="text-slate-500 text-sm font-medium">Track items pending valid classification or reimbursement.</p>
                </div>
                <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net Outstanding</span>
                    <span className={cn("text-xl font-black", pendingItems.reduce((acc, t) => acc + t.amount, 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {formatCurrency(pendingItems.reduce((acc, t) => acc + t.amount, 0), settings.currency)}
                    </span>
                </div>
            </div>

            {suggestedMatches.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                        </div>
                        <h2 className="text-xl font-black text-foreground tracking-tight">Suggested Matches</h2>
                        <Badge variant="secondary" className="ml-2 bg-purple-500/10 text-purple-600 border-purple-200">{suggestedMatches.length} found</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                        {suggestedMatches.map(({ item1, item2 }) => (
                            <MatchCard
                                key={`${item1.id}-${item2.id}`}
                                item1={item1}
                                item2={item2}
                                currency={settings.currency}
                                dateFormat={dateFormat}
                                onMatch={() => handleApproveMatch(item1, item2)}
                                onIgnore={() => handleIgnoreMatch(item1.id, item2.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {unknownItems.length > 0 && (
                <div className="space-y-4 bg-orange-50/50 pb-6 rounded-3xl p-4 md:p-6 ring-1 ring-orange-100/50 shadow-sm border border-orange-200/50 mb-12">
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <div className="p-1.5 bg-orange-100 rounded-lg">
                            <HelpCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <h2 className="text-xl font-black text-foreground tracking-tight text-orange-950">Unknown Transactions</h2>
                        <Badge variant="secondary" className="ml-2 bg-orange-100/50 text-orange-700 border-orange-200">{unknownItems.length}</Badge>
                    </div>

                    <div className="flex flex-col divide-y divide-orange-200/50 bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
                        {unknownItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedTransaction(item)}
                                className="flex items-center justify-between p-3.5 px-6 hover:bg-orange-50/50 transition-colors cursor-pointer group/row"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-bold text-slate-400 w-24 tabular-nums">{formatDate(item.date, false, dateFormat)}</span>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-slate-700">{item.clean_source || item.source}</span>
                                        {item.notes && (
                                            <span className="text-[10px] text-slate-400 font-medium italic line-clamp-1">
                                                Note: {item.notes}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className={cn(
                                        "font-black text-sm",
                                        item.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {formatCurrency(item.amount, settings.currency)}
                                    </span>

                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <Select
                                            onValueChange={(val) => {
                                                if (val === 'new') {
                                                    createNewEntity();
                                                } else {
                                                    bulkUpdate({
                                                        ids: [item.id],
                                                        updates: { status: 'Pending Reconciliation', entity: val }
                                                    });
                                                    toast.success(`Assigned to ${val}`);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-[140px] text-[10px] font-black uppercase tracking-wider bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors">
                                                <SelectValue placeholder="SET ENTITY" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {existingEntities.map(entity => (
                                                    <SelectItem key={entity} value={entity} className="text-[10px] uppercase font-black tracking-tight">{entity}</SelectItem>
                                                ))}
                                                <SelectItem value="new" className="text-blue-600 font-bold border-t mt-1">+ New Entity</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetPendingTriage(item);
                                            }}
                                            title="Return to Triage"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4 bg-white/50 backdrop-blur pb-8 rounded-3xl p-4 md:p-6 ring-1 ring-slate-100/50 shadow-sm border border-slate-200/50">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                            <History className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-black text-foreground tracking-tight">Outstanding Items by Entity</h2>
                    </div>
                    <Button
                        onClick={createNewEntity}
                        variant="secondary"
                        size="sm"
                        className="h-8 shadow-sm font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Entity
                    </Button>
                </div>

                <Accordion type="multiple" className="w-full space-y-4">
                    {Object.entries(groupedByEntity).map(([entity, items]) => {
                        const entityBalance = items.reduce((acc, i) => acc + i.amount, 0);

                        return (
                            <AccordionItem value={entity} key={entity} className="border-none shadow-sm bg-card overflow-hidden ring-1 ring-border/50 rounded-2xl">
                                <AccordionTrigger className="hover:no-underline hover:bg-slate-50 bg-white border-b border-border/40 py-4 px-6 data-[state=open]:border-b group relative">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-xl shadow-sm border border-border/50">
                                            {getEntityIcon(entity)}
                                        </div>
                                        <div className="text-left flex flex-col">
                                            {renamingEntity === entity ? (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <Input
                                                        value={newEntityName}
                                                        onChange={e => setNewEntityName(e.target.value)}
                                                        className="h-8 w-[200px] font-bold"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveRename(entity);
                                                            if (e.key === 'Escape') setRenamingEntity(null);
                                                        }}
                                                    />
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleSaveRename(entity)}>
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={() => setRenamingEntity(null)}>
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/title">
                                                    <span className="text-lg font-black tracking-tight">{entity}</span>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRenamingEntity(entity);
                                                            setNewEntityName(entity);
                                                        }}
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            )}
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                {items.length} ACTIVE ITEMS
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center pr-4">
                                        <span className={cn("font-black text-lg", entityBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                            {formatCurrency(entityBalance, settings.currency)}
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0 bg-slate-50/30">
                                    {items.length === 0 ? (
                                        <div className="p-6 text-center text-sm text-slate-400 font-medium italic">
                                            No transactions assigned to this entity.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col divide-y divide-border/30">
                                            {items.map(item => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => setSelectedTransaction(item)}
                                                    className="flex items-center justify-between p-3.5 px-6 hover:bg-white transition-colors cursor-pointer group/row"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs font-bold text-slate-400 w-24 tabular-nums">{formatDate(item.date, false, dateFormat)}</span>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm text-slate-700">{item.clean_source || item.source}</span>
                                                            {(item.category || item.sub_category) && (
                                                                <span className="text-[10px] text-slate-400 font-medium">
                                                                    {item.category}{item.sub_category ? ` • ${item.sub_category}` : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "font-black text-sm",
                                                            item.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                                                        )}>
                                                            {formatCurrency(item.amount, settings.currency)}
                                                        </span>
                                                        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                            EDIT
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>

                {Object.keys(groupedByEntity).length > 3 && (
                    <div className="pt-2 flex justify-center">
                        <Button onClick={createNewEntity} variant="ghost" size="sm" className="font-bold text-slate-400 hover:text-slate-800">
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add Another Entity
                        </Button>
                    </div>
                )}
            </div>

            {/* Reconciliation History Section */}
            {reconciledItems.length > 0 && (
                <div className="space-y-6 pt-10 border-t border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                <History className="w-5 h-5 text-slate-600" />
                            </div>
                            <h2 className="text-xl font-black text-foreground tracking-tight">Reconciliation History</h2>
                            <Badge variant="outline" className="ml-2">{reconciledItems.length} items</Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowHistory(!showHistory)}
                            className="text-muted-foreground font-bold"
                        >
                            {showHistory ? 'Hide History' : 'Show History'}
                        </Button>
                    </div>

                    {showHistory && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                            {Object.entries(groupedHistory).map(([entity, sessions]) => (
                                <div key={`history-${entity}`} className="space-y-4">
                                    <div className="flex items-center gap-2 px-2 pb-1 border-b border-slate-100">
                                        <User className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{entity}</span>
                                    </div>
                                    <div className="space-y-6">
                                        {sessions.map((items, sessionIdx) => (
                                            <div key={`${entity}-session-${sessionIdx}`} className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reconciled Batch • {formatDate(items[0].updated_at || items[0].date, false, dateFormat)}</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{items.length} ITEM{items.length > 1 ? 'S' : ''}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {items.map(item => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center gap-4 py-2 px-1 border-b border-slate-100/30 last:border-0 text-xs group"
                                                        >
                                                            <div className="w-[80px] text-slate-400 font-medium">{formatDate(item.date, false, dateFormat)}</div>
                                                            <div className="flex-1 font-bold truncate text-slate-600">{item.source}</div>
                                                            <div className={cn("w-[100px] text-right font-black", item.amount >= 0 ? "text-emerald-600/60" : "text-rose-600/60")}>
                                                                {formatCurrency(item.amount, settings.currency)}
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleUnreconcile(item.id, entity)}
                                                                className="opacity-0 group-hover:opacity-100 h-6 px-2 text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all"
                                                            >
                                                                Restore
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <TransactionDetailDialog
                transaction={selectedTransaction}
                open={!!selectedTransaction}
                onOpenChange={(open) => !open && setSelectedTransaction(null)}
                onSave={async (updates) => {
                    if (selectedTransaction) {
                        await bulkUpdate({ ids: [selectedTransaction.id], updates });
                    }
                }}
            />

            <Dialog open={!!promptingNoteTx} onOpenChange={(open) => !open && setPromptingNoteTx(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <ArrowLeft className="w-5 h-5 text-indigo-500" />
                            Return to Triage
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium pb-2 border-b">
                            Please provide a brief note explaining why this transaction is being sent back to triage.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none truncate max-w-[200px]">{promptingNoteTx?.clean_source || promptingNoteTx?.source}</span>
                                <span className="font-mono font-black text-slate-900 leading-none">{formatCurrency(promptingNoteTx?.amount || 0, settings.currency)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">{promptingNoteTx?.date && formatDate(promptingNoteTx.date, false, dateFormat)}</div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Triage Note</Label>
                            <Input
                                autoFocus
                                placeholder="e.g. Needs to be split, unknown source..."
                                value={triageNote}
                                onChange={(e) => setTriageNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submitTriageNote()}
                                className="bg-white border-slate-200"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setPromptingNoteTx(null)}
                            className="text-slate-400 hover:text-slate-600 font-bold uppercase text-[10px] tracking-widest"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-indigo-200/50"
                            onClick={submitTriageNote}
                            disabled={triageNote.trim().length === 0}
                        >
                            Submit & Move
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Reconciliation;
