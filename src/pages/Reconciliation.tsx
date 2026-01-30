import { useMemo, useState } from 'react';
// Page dealing with pending transactions and offsetting matches
import { useTransactionTable, Transaction } from '@/components/Transactions/hooks/useTransactionTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRightLeft, X } from 'lucide-react';
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
        <Card className="mb-4 border-dashed border-2 hover:border-solid hover:border-primary/50 transition-all bg-card/50">
            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 space-y-2 w-full">
                    <div className="flex justify-between">
                        <span className="text-xs font-bold text-muted-foreground">{item1.date}</span>
                        <Badge variant="outline" className="text-xs">{item1.category}</Badge>
                    </div>
                    <div className="font-medium truncate">{item1.merchant}</div>
                    <div className={cn("font-bold text-lg", item1.amount >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {formatCurrency(item1.amount, currency)}
                    </div>
                </div>

                <div className="flex md:flex-col items-center justify-center p-2 text-muted-foreground bg-muted/30 rounded-full">
                    <ArrowRightLeft className="w-4 h-4" />
                </div>

                <div className="flex-1 space-y-2 w-full text-right md:text-left">
                    <div className="flex justify-between md:flex-row-reverse">
                        <span className="text-xs font-bold text-muted-foreground">{item2.date}</span>
                        <Badge variant="outline" className="text-xs">{item2.category}</Badge>
                    </div>
                    <div className="font-medium truncate">{item2.merchant}</div>
                    <div className={cn("font-bold text-lg", item2.amount >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {formatCurrency(item2.amount, currency)}
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-border/50 justify-end">
                    <Button variant="ghost" size="sm" onClick={onIgnore} className="text-muted-foreground hover:text-red-500">
                        <X className="w-4 h-4 mr-1" />
                        Ignore
                    </Button>
                    <Button size="sm" onClick={onMatch} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Check className="w-4 h-4 mr-1" />
                        Approve Match
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const Reconciliation = () => {
    const { transactions, handleBulkCellEdit } = useTransactionTable();
    const { settings } = useSettings();
    const [ignoredMatches, setIgnoredMatches] = useState<Set<string>>(new Set());

    // Filter for Pending Reconciliation items
    const pendingItems = useMemo(() => {
        return transactions.filter(t =>
            t.status === 'Pending Reconciliation' ||
            t.status.startsWith('Pending: ')
        );
    }, [transactions]);

    // Find suggested matches
    const suggestedMatches = useMemo(() => {
        const matches: { item1: Transaction, item2: Transaction }[] = [];
        const processedIds = new Set<string>();

        // items to search against (exclude currently processing pending items to avoid self-match logic errors if not careful, 
        // but actually we want to match pending against ANY transactions, including other pending or normal ones)
        // However, we typically want to match a Pending Item against a "New" item that just came in

        pendingItems.forEach(item => {
            if (processedIds.has(item.id) || ignoredMatches.has(item.id)) return;

            // Search for inverse amount
            // Constraint: Must be same Category and SubCategory (as requested)
            const match = transactions.find(t =>
                t.id !== item.id &&
                !processedIds.has(t.id) &&
                !ignoredMatches.has(t.id) &&
                Math.abs(t.amount) === Math.abs(item.amount) &&
                ((t.amount > 0 && item.amount < 0) || (t.amount < 0 && item.amount > 0)) &&
                t.category === item.category &&
                t.sub_category === item.sub_category
            );

            if (match) {
                matches.push({ item1: item, item2: match });
                processedIds.add(item.id);
                processedIds.add(match.id);
            }
        });

        return matches;
    }, [pendingItems, transactions, ignoredMatches]);

    const handleApproveMatch = (item1: Transaction, item2: Transaction) => {
        // Mark both as 'Reconciled'
        // This makes them visible in budget (since they are no longer Pending Reconciliation)
        // and they offset each other (sum to 0).
        handleBulkCellEdit(item1.id, { status: 'Reconciled' });
        handleBulkCellEdit(item2.id, { status: 'Reconciled' });

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

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tighter text-foreground">Reconciliation</h1>
                <p className="text-muted-foreground text-lg">Manage pending items and resolve offsetting transactions.</p>
            </div>

            {suggestedMatches.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-purple-500" />
                        <h2 className="text-xl font-bold text-foreground">Suggested Matches</h2>
                        <Badge variant="secondary" className="ml-2 bg-purple-500/10 text-purple-600 border-purple-200">{suggestedMatches.length} found</Badge>
                    </div>
                    <div className="grid grid-cols-1">
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

            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                    <h2 className="text-xl font-bold text-foreground">Outstanding Items</h2>
                </div>
                <ReconciliationOverview />
            </div>
        </div>
    );
};

const SparklesIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
);

export default Reconciliation;
