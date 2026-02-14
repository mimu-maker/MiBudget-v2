import { useState, useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, ArrowRight, Info, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import { SourceNameSelector } from './SourceNameSelector';
import { TransactionNote } from './TransactionNote';
import { useSettings } from '@/hooks/useSettings';
import { SKIP_PATTERNS } from '@/lib/importBrain';

interface SourceMappingRefinerProps {
    source: string;
    txs: any[];
    allPendingTxs: any[];
    onSave: (cleanName: string, pattern: string, selectedIds: string[]) => void;
    onCancel: () => void;
    onUpdateNote: (id: string, note: string) => void;
}

export const SourceMappingRefiner = ({
    source,
    txs,
    allPendingTxs,
    onSave,
    onCancel,
    onUpdateNote
}: SourceMappingRefinerProps) => {
    const { settings, saveSettings } = useSettings();

    // Use actual settings noise filters PLUS the hardcoded SKIP_PATTERNS to be robust
    const noiseFilters = useMemo(() => {
        const userFilters = settings.noiseFilters || [];
        // Combine and deduplicate
        return Array.from(new Set([...userFilters, ...SKIP_PATTERNS]));
    }, [settings.noiseFilters]);

    const [cleanName, setCleanName] = useState(() => {
        const words = source.split(' ').filter(w => w.length > 0);
        // Iteratively skip lead-in background noise
        let startIndex = 0;
        while (startIndex < words.length) {
            const word = words[startIndex].toUpperCase();
            // Skip if word is in noise filters OR is just a single character (like 'K' or 'S')
            // Special check for 'BS' and other known noise
            const isNoise = noiseFilters.some(f => {
                const fClean = f.toUpperCase().replace(/\*/g, '').trim();
                return fClean === word || word.startsWith(fClean + '-') || word.endsWith('-' + fClean);
            });

            if (isNoise || word.length <= 1) {
                startIndex++;
            } else {
                break;
            }
        }
        // If we found a good start, let's see if the next word is also "good" (not a location/digit)
        // This helps get "APPLUS PADBORG" instead of just "APPLUS" if desired, 
        // though for patterns usually one word is better.
        // Actually, let's stick to the first good word for the DEFAULT pattern, 
        // as it's more likely to match future variations.
        const found = words[startIndex] || words[0] || source;
        return found;
    });

    const [pattern, setPattern] = useState(cleanName);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(txs.map(t => t.id)));

    // Categorize matches
    const { seedTxs, similarTxs } = useMemo(() => {
        if (!pattern) return { seedTxs: [], similarTxs: [] };

        const patternLower = pattern.toLowerCase();
        const results = allPendingTxs.filter(tx =>
            tx.source?.toLowerCase().includes(patternLower) ||
            tx.clean_source?.toLowerCase().includes(patternLower) ||
            tx.description?.toLowerCase().includes(patternLower)
        );

        // Seed are those that were explicitly selected (or identical to seed name)
        const seedSourceNames = new Set(txs.map(t => t.source.toLowerCase()));

        const seed: any[] = [];
        const similar: any[] = [];

        results.forEach(tx => {
            if (seedSourceNames.has(tx.source.toLowerCase())) {
                seed.push(tx);
            } else {
                similar.push(tx);
            }
        });

        return { seedTxs: seed, similarTxs: similar };
    }, [pattern, allPendingTxs, txs]);

    const filteredTxs = useMemo(() => [...seedTxs, ...similarTxs], [seedTxs, similarTxs]);

    // Check if pattern contains noise
    const isNoisePattern = useMemo(() => {
        const pUpper = pattern.toUpperCase();
        return noiseFilters.some(f => {
            const fClean = f.toUpperCase().replace(/\*/g, '').trim();
            if (!fClean) return false;
            return pUpper === fClean || pUpper.startsWith(fClean + ' ');
        });
    }, [pattern, noiseFilters]);

    // Auto-select only SEED items when results change or pattern is first set
    useEffect(() => {
        setSelectedIds(new Set(seedTxs.map(t => t.id)));
    }, [seedTxs]);

    const handleToggle = (id: string, forceValue?: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (forceValue === true) next.add(id);
            else if (forceValue === false) next.delete(id);
            else {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            }
            return next;
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Source Clean Name (Pill Name)</Label>
                    <SourceNameSelector
                        value={cleanName}
                        hideAddNew={false}
                        onChange={(v) => {
                            const oldCleanName = cleanName;
                            setCleanName(v);
                            // If pattern is empty, OR it's currently the same as our old default cleanName,
                            // we update it to the new selection (cleaned of synonyms/suffixes)
                            const cleanV = v.split(' (')[0].split(' *')[0].split('  ')[0].trim();
                            if (!pattern || pattern.toUpperCase() === oldCleanName.toUpperCase()) {
                                setPattern(cleanV);
                            }
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Match Pattern (Raw Name Keyword)</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            placeholder="Enter keyword to match..."
                            className="h-10 pl-9 font-mono text-sm bg-white"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center px-1 mb-1">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="master-select"
                            checked={filteredTxs.length > 0 && selectedIds.size === filteredTxs.length}
                            onCheckedChange={(checked) => {
                                if (checked) setSelectedIds(new Set(filteredTxs.map(t => t.id)));
                                else setSelectedIds(new Set());
                            }}
                            className="h-4 w-4 bg-white"
                        />
                        <Label htmlFor="master-select" className="text-[10px] uppercase font-black text-slate-500 cursor-pointer">
                            Apply mapping to {selectedIds.size} of {filteredTxs.length} {filteredTxs.length === 1 ? 'match' : 'matches'}
                        </Label>
                    </div>
                    <div className="flex gap-2">
                        {selectedIds.size > 0 && (
                            <Button variant="ghost" size="sm" className="text-[10px] h-6 font-bold text-slate-400 hover:text-slate-600" onClick={() => setSelectedIds(new Set())}>Clear All</Button>
                        )}
                    </div>
                </div>

                <div className="max-h-[350px] overflow-y-auto border-2 border-slate-100 rounded-xl divide-y bg-white/50 backdrop-blur-sm shadow-inner group/list">
                    {filteredTxs.map(tx => (
                        <ExpandableTransactionRow
                            key={tx.id}
                            tx={tx}
                            isSelected={selectedIds.has(tx.id)}
                            onToggle={(force) => handleToggle(tx.id, force)}
                            onUpdateNote={onUpdateNote}
                            currency={settings.currency}
                        />
                    ))}
                    {filteredTxs.length === 0 && (
                        <div className="p-8 text-center text-slate-400 italic text-sm flex flex-col items-center gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            No matching unmapped transactions found
                        </div>
                    )}
                </div>
            </div>

            <Alert className={cn("py-3", isNoisePattern ? "bg-rose-50 border-rose-100" : "bg-blue-50/50 border-blue-100")}>
                <Info className={cn("w-4 h-4 mt-0.5", isNoisePattern ? "text-rose-600" : "text-blue-600")} />
                <AlertDescription className={cn("text-[11px] leading-tight font-medium", isNoisePattern ? "text-rose-700" : "text-blue-800")}>
                    {isNoisePattern ? (
                        <div className="flex flex-col gap-2">
                            <div>
                                <span className="font-black uppercase text-[9px] block mb-1">Warning: Noise Pattern Detected</span>
                                It looks like you're matching <span className="font-black">"{pattern}"</span>, which is a common bank prefix.
                                We recommend including more specific text to avoid matching irrelevant transactions.
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[9px] font-black border-rose-200 text-rose-700 hover:bg-rose-100 w-fit"
                                onClick={() => {
                                    if (window.confirm(`Do you want to add "${pattern}" to Anti-Rules (Noise Filters)?`)) {
                                        const current = settings.noiseFilters || [];
                                        saveSettings({ noiseFilters: Array.from(new Set([...current, pattern])) });
                                        onCancel();
                                    }
                                }}
                            >
                                <Zap className="w-3 h-3 mr-1" /> ADD TO ANTI-RULES INSTEAD
                            </Button>
                        </div>
                    ) : (
                        <>
                            This will create a mapping rule for <span className="font-black">"{pattern}"</span> → <span className="font-black">"{cleanName}"</span>.
                            Affected transactions will move to <span className="font-black italic">Pending Categorisation</span>.
                        </>
                    )}
                </AlertDescription>
            </Alert>

            <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 font-bold text-slate-500" onClick={onCancel}>Cancel</Button>
                <Button
                    className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-12 shadow-xl shadow-blue-100 h-11 text-base group"
                    onClick={() => onSave(cleanName, pattern, Array.from(selectedIds))}
                    disabled={!cleanName || selectedIds.size === 0}
                >
                    Map {selectedIds.size} Transaction{selectedIds.size !== 1 ? 's' : ''}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
};

const ExpandableTransactionRow = ({ tx, isSelected, onToggle, onUpdateNote, currency }: {
    tx: any,
    isSelected: boolean,
    onToggle: (force?: boolean) => void,
    onUpdateNote?: (id: string, note: string) => void,
    currency: string
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={cn(
            "group/row transition-all duration-200",
            isSelected ? "bg-blue-50/40" : "opacity-50 grayscale-[0.5]",
            isExpanded && "bg-slate-50/80 ring-1 ring-slate-200 z-10 relative opacity-100 grayscale-0"
        )}>
            <div
                className="flex items-center p-2.5 px-4 cursor-pointer hover:bg-slate-50/50"
                onClick={() => onToggle()}
            >
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onToggle(checked === true)}
                    onClick={(e) => e.stopPropagation()}
                    className="mr-4 h-5 w-5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />

                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-bold text-slate-800 truncate text-xs">{tx.source}</span>
                        <span className={cn("font-black font-mono tabular-nums text-xs ml-4", tx.amount < 0 ? "text-slate-900" : "text-emerald-600")}>
                            {formatCurrency(tx.amount, currency)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        <span>{tx.date}</span>
                        {tx.description && tx.description !== tx.source && (
                            <>
                                <span className="text-slate-200">|</span>
                                <span className="truncate italic normal-case max-w-[150px]">{tx.description}</span>
                            </>
                        )}

                        {onUpdateNote && (
                            <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                                <TransactionNote transaction={tx} onSave={onUpdateNote} />
                            </div>
                        )}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-slate-200 rounded-full ml-2 text-slate-400"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
            </div>

            {isExpanded && (
                <div className="px-12 pb-4 pt-1 text-xs space-y-2 animate-in slide-in-from-top-1">
                    <div className="grid grid-cols-[80px_1fr] gap-2 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <div className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Full Source</div>
                        <div className="font-mono text-slate-700 break-all">{tx.source}</div>

                        {tx.description && (
                            <>
                                <div className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Description</div>
                                <div className="text-slate-600 italic">{tx.description}</div>
                            </>
                        )}

                        <div className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Amount</div>
                        <div className="font-mono font-bold text-slate-900">{formatCurrency(tx.amount, currency)}</div>

                        <div className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Date</div>
                        <div className="font-mono text-slate-600">{tx.date}</div>

                        {tx.notes && (
                            <>
                                <div className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Notes</div>
                                <div className="text-amber-700 bg-amber-50 p-2 rounded text-xs italic">{tx.notes}</div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
