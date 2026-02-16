import { useMemo, useState } from 'react';
// Page dealing with pending transactions and offsetting matches
import { useTransactionTable, Transaction } from '@/components/Transactions/hooks/useTransactionTable';
import { EditableCell } from '@/components/Transactions/EditableCell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRightLeft, X, Sparkles, Split, History, User, Building, Briefcase, AlertCircle, RefreshCw } from 'lucide-react';
import { ReconciliationOverview } from '@/components/Overview/ReconciliationOverview';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';
import { Toaster, toast } from 'sonner';

const MatchCard = ({ item1, item2, onMatch, onIgnore, currency }: {
    item1: Transaction,
    item2: Transaction,
    onMatch: () => void,
    onIgnore: () => void,
    currency: string
}) => {
    return (
        <Card className="mb-4 border-dashed border-2 hover:border-solid hover:border-primary/50 transition-all bg-card/50 group">
            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 space-y-2 w-full">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground">{item1.date}</span>
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
                        <span className="text-xs font-bold text-muted-foreground">{item2.date}</span>
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

const EntityRow = ({
    item,
    isSelected,
    onToggle,
    onSplit,
    currency,
    isEditing,
    editingField,
    onEdit,
    onStartEdit,
    onStopEdit
}: {
    item: Transaction,
    isSelected: boolean,
    onToggle: () => void,
    onSplit: (id: string) => void,
    currency: string,
    isEditing: boolean,
    editingField: keyof Transaction | null,
    onEdit: (id: string, field: keyof Transaction, value: any) => void,
    onStartEdit: (id: string, field: keyof Transaction) => void,
    onStopEdit: () => void
}) => {
    return (
        <div
            className={cn(
                "group flex items-center gap-4 p-3 bg-card hover:bg-accent/30 border rounded-xl transition-all cursor-pointer",
                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/40"
            )}
            onClick={onToggle}
        >
            <div className="flex items-center justify-center">
                <div className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                )}>
                    {isSelected && <Check className="w-3 h-3" />}
                </div>
            </div>

            <div className="w-[100px]" onClick={(e) => e.stopPropagation()}>
                <EditableCell
                    transaction={item}
                    field="date"
                    isEditing={isEditing && editingField === 'date'}
                    onEdit={onEdit}
                    onStartEdit={onStartEdit}
                    onStopEdit={onStopEdit}
                    onBulkEdit={() => { }} // Not needed here
                />
            </div>

            <div className="flex-1 flex flex-col min-w-0" onClick={(e) => e.stopPropagation()}>
                <EditableCell
                    transaction={item}
                    field="source"
                    isEditing={isEditing && editingField === 'source'}
                    onEdit={onEdit}
                    onStartEdit={onStartEdit}
                    onStopEdit={onStopEdit}
                    onBulkEdit={() => { }}
                    customDisplay={
                        <div className="font-bold text-foreground/90 truncate">{item.source}</div>
                    }
                />
                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-1">
                    <span className="truncate max-w-[150px]">{item.category || 'No Category'}</span>
                    {item.sub_category && (
                        <>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">{item.sub_category}</span>
                        </>
                    )}
                </div>
            </div>

            <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-all"
                onClick={(e) => {
                    e.stopPropagation();
                    onSplit(item.id);
                }}
                title="Partial Refund (Split)"
            >
                <Split className="w-4 h-4" />
            </Button>

            <div className="w-[120px] text-right" onClick={(e) => e.stopPropagation()}>
                <EditableCell
                    transaction={item}
                    field="amount"
                    isEditing={isEditing && editingField === 'amount'}
                    onEdit={onEdit}
                    onStartEdit={onStartEdit}
                    onStopEdit={onStopEdit}
                    onBulkEdit={() => { }}
                />
            </div>
        </div>
    );
};

const Reconciliation = () => {
    const { transactions, handleBulkCellEdit, splitTransaction, bulkUpdate, handleCellEdit } = useTransactionTable();
    const { settings } = useSettings();
    const [ignoredMatches, setIgnoredMatches] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<keyof Transaction | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const handleStartEdit = (id: string, field: keyof Transaction) => {
        setEditingId(id);
        setEditingField(field);
    };

    const handleStopEdit = () => {
        setEditingId(null);
        setEditingField(null);
    };

    const handleLocalEdit = (id: string, field: keyof Transaction, value: any) => {
        handleCellEdit(id, field, value);
        // Don't stop edit immediately for status to allow secondary dropdown
        if (field !== 'status') {
            // handleStopEdit(); // Let EditableCell decide when to stop via onStopEdit
        }
    };

    // Filter for Pending Reconciliation items
    const pendingItems = useMemo(() => {
        return transactions.filter(t =>
            (t.status === 'Pending Reconciliation' ||
                t.status.startsWith('Pending: ') ||
                !!t.entity) && !t.excluded
        );
    }, [transactions]);

    // Filter for Reconciled items
    const reconciledItems = useMemo(() => {
        return transactions.filter(t => t.status === 'Reconciled' && (!!t.entity || t.status.startsWith('Pending: ')));
    }, [transactions]);

    // Group reconciled items by entity
    const groupedHistory = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        reconciledItems.forEach(item => {
            const entity = item.entity || (item.status?.startsWith('Pending: ') ? item.status.replace('Pending: ', '') : 'Reconciled');
            if (!groups[entity]) groups[entity] = [];
            groups[entity].push(item);
        });
        return groups;
    }, [reconciledItems]);

    // Group items by entity
    const groupedByEntity = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        pendingItems.forEach(item => {
            let entity = 'Unassigned';
            if (item.entity) {
                entity = item.entity;
            } else if (item.status && item.status.startsWith('Pending: ')) {
                entity = item.status.replace('Pending: ', '');
            }

            if (!groups[entity]) groups[entity] = [];
            groups[entity].push(item);
        });
        return groups;
    }, [pendingItems]);

    // Find suggested matches (auto-pair same amount)
    const suggestedMatches = useMemo(() => {
        const matches: { item1: Transaction, item2: Transaction }[] = [];
        const processedIds = new Set<string>();

        pendingItems.forEach(item => {
            if (processedIds.has(item.id) || ignoredMatches.has(item.id)) return;

            // Search for inverse amount
            // Constraint: Ideally same entity, but can be cross-entity if amount is exact?
            // User requested grouping by entity, so let's stick to same entity for auto-pairing to be safe/clear

            let entity = item.entity || (item.status?.startsWith('Pending: ') ? item.status.replace('Pending: ', '') : '');

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

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleReconcileSelected = (entity: string) => {
        const selectedForEntity = Array.from(selectedIds).filter(id => {
            const tx = transactions.find(t => t.id === id);
            const txEntity = tx?.entity || (tx?.status?.startsWith('Pending: ') ? tx.status.replace('Pending: ', '') : 'Unassigned');
            return txEntity === entity;
        });

        if (selectedForEntity.length === 0) return;

        const sum = selectedForEntity.reduce((acc, id) => {
            const tx = transactions.find(t => t.id === id);
            return acc + (tx?.amount || 0);
        }, 0);

        if (Math.abs(sum) > 0.01) {
            toast.error("Imbalanced Selection", {
                description: `Selection must sum to 0. Current sum: ${formatCurrency(sum, settings.currency)}`
            });
            return;
        }

        bulkUpdate({
            ids: selectedForEntity,
            updates: { status: 'Reconciled' }
        });

        setSelectedIds(new Set());
        toast.success("Batch Reconciled", {
            description: `Successfully reconciled ${selectedForEntity.length} items for ${entity}`
        });
    };

    const handleUnreconcile = (id: string) => {
        handleCellEdit(id, 'status', 'Pending Reconciliation');
        toast.success("Transaction Restored", {
            description: "Moving back to outstanding items."
        });
    };

    const handleSplit = async (id: string) => {
        const tx = transactions.find(t => t.id === id);
        if (!tx) return;

        const input = prompt(`Enter amount for first split part (original: ${tx.amount}):`);
        if (input === null) return;

        const amount1 = parseFloat(input.replace(',', '.'));
        if (isNaN(amount1)) {
            toast.error("Invalid amount");
            return;
        }

        try {
            await splitTransaction(id, amount1);
            toast.success("Transaction Split Successfully");
        } catch (e) {
            toast.error("Split failed");
        }
    };

    const getEntityIcon = (entityName: string) => {
        const name = entityName.toLowerCase();
        if (name.includes('work') || name.includes('reimbersment')) return <Briefcase className="w-5 h-5 text-blue-500" />;
        if (name.includes('company') || name.includes('refund') || name.includes('support')) return <Building className="w-5 h-5 text-amber-500" />;
        return <User className="w-5 h-5 text-indigo-500" />;
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-32">
            <div className="flex flex-col gap-2">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground">Reconciliation</h1>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{pendingItems.length} Pending</Badge>
                </div>
                <p className="text-muted-foreground text-lg">Grouped by Entity. Select items that offset to zero to reconcile.</p>
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
                                onMatch={() => handleApproveMatch(item1, item2)}
                                onIgnore={() => handleIgnoreMatch(item1.id, item2.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-8">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                        <History className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-black text-foreground tracking-tight">Outstanding Items by Entity</h2>
                </div>

                {Object.entries(groupedByEntity).map(([entity, items]) => {
                    const selectedForEntity = items.filter(i => selectedIds.has(i.id));
                    const selectedSum = selectedForEntity.reduce((acc, i) => acc + i.amount, 0);
                    const isBalanced = selectedForEntity.length > 0 && Math.abs(selectedSum) < 0.01;
                    const entityBalance = items.reduce((acc, i) => acc + i.amount, 0);

                    return (
                        <Card key={entity} className="border-none shadow-xl bg-card/60 overflow-hidden ring-1 ring-border/50">
                            <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl shadow-sm border border-border/50">
                                            {getEntityIcon(entity)}
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl font-black tracking-tight">{entity}</CardTitle>
                                            <CardDescription className="text-xs font-bold uppercase tracking-wider">
                                                {items.length} ACTIVE ITEMS • NET:
                                                <span className={cn("ml-1", entityBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                    {formatCurrency(entityBalance, settings.currency)}
                                                </span>
                                            </CardDescription>
                                        </div>
                                    </div>

                                    {selectedForEntity.length > 0 && (
                                        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-2">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-black uppercase text-muted-foreground mr-1">Selection Sum</span>
                                                <span className={cn("font-black text-xl tracking-tighter", isBalanced ? "text-emerald-500" : "text-amber-500")}>
                                                    {formatCurrency(selectedSum, settings.currency)}
                                                </span>
                                            </div>
                                            <Button
                                                onClick={() => handleReconcileSelected(entity)}
                                                disabled={!isBalanced}
                                                className={cn(
                                                    "h-12 px-6 font-black transition-all shadow-lg hover:shadow-xl",
                                                    isBalanced ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                <Check className="w-5 h-5 mr-2" />
                                                RECONCILE
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                {items.map(item => (
                                    <EntityRow
                                        key={item.id}
                                        item={item}
                                        isSelected={selectedIds.has(item.id)}
                                        onToggle={() => toggleSelection(item.id)}
                                        onSplit={handleSplit}
                                        currency={settings.currency}
                                        isEditing={editingId === item.id}
                                        editingField={editingField}
                                        onEdit={handleLocalEdit}
                                        onStartEdit={handleStartEdit}
                                        onStopEdit={handleStopEdit}
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    );
                })}
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
                            {Object.entries(groupedHistory).map(([entity, items]) => (
                                <div key={`history-${entity}`} className="space-y-2">
                                    <div className="flex items-center gap-2 px-2">
                                        <User className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{entity}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {items.map(item => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-4 p-2 bg-muted/20 border border-transparent rounded-lg hover:border-border/50 transition-all text-xs group"
                                            >
                                                <div className="w-[80px] text-muted-foreground font-medium">{item.date}</div>
                                                <div className="flex-1 font-bold truncate text-muted-foreground">{item.source}</div>
                                                <div className={cn("w-[100px] text-right font-black", item.amount >= 0 ? "text-emerald-600/60" : "text-rose-600/60")}>
                                                    {formatCurrency(item.amount, settings.currency)}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleUnreconcile(item.id)}
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
                    )}
                </div>
            )}
        </div>
    );
};

export default Reconciliation;
