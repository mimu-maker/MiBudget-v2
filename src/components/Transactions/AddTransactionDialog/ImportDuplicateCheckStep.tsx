import { useState, useMemo } from 'react';
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, Loader2, List, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrency, formatDate } from '@/lib/formatUtils';
import { useProfile } from '@/contexts/ProfileContext';

interface ImportDuplicateCheckStepProps {
    preview: any[];
    conflicts: any[];
    selectedConflictIds: Set<string>;
    toggleConflictSelection: (id: string) => void;
    selectAllConflicts: (select: boolean) => void;
    setStep: (step: number) => void;
    executeImport: () => Promise<void>;
    isProcessing: boolean;
}

export const ImportDuplicateCheckStep = ({
    preview,
    conflicts,
    selectedConflictIds,
    toggleConflictSelection,
    selectAllConflicts,
    setStep,
    executeImport,
    isProcessing
}: ImportDuplicateCheckStepProps) => {
    const { settings } = useSettings();
    const { userProfile } = useProfile();
    const allSelected = conflicts.length > 0 && selectedConflictIds.size === conflicts.length;

    const isLargeDataset = conflicts.length > 300 || preview.length > 300;
    const [showFullList, setShowFullList] = useState(!isLargeDataset);

    // Category breakdown for summary
    const categoryBreakdown = useMemo(() => {
        const catMap: Record<string, { amount: number, count: number }> = {};
        preview.forEach(tx => {
            const cat = tx.category || "Uncategorized";
            if (!catMap[cat]) catMap[cat] = { amount: 0, count: 0 };
            catMap[cat].amount += (Number(tx.amount) || 0);
            catMap[cat].count += 1;
        });

        return Object.entries(catMap)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    }, [preview]);

    return (
        <div className="animate-in slide-in-from-right-4 fade-in max-w-4xl mx-auto space-y-6 py-8">
            <div className="text-center space-y-4">
                <div className="mx-auto bg-rose-100 p-5 rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-inner animate-pulse">
                    <AlertTriangle className="w-10 h-10 text-rose-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Import Confirmation</h3>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                    Review your final import summary and duplicate handling.
                </p>
            </div>

            {!showFullList ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-8 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-rose-500" />

                    {/* Final Category Summary */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <List className="w-5 h-5 text-slate-400" />
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Final Category Summary ({preview.length} total tx)</h4>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden shadow-inner max-h-[300px] overflow-y-auto">
                            {categoryBreakdown.map((cat, idx) => (
                                <div key={idx} className="flex justify-between items-center py-2.5 px-4 hover:bg-white transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700 leading-tight">{cat.name}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{cat.count} items</span>
                                    </div>
                                    <span className={cn(
                                        "font-mono font-black text-xs",
                                        cat.amount < 0 ? "text-slate-700" : "text-emerald-600"
                                    )}>
                                        {formatCurrency(cat.amount, settings.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 flex items-start gap-4">
                        <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-base font-bold text-amber-800">Duplicate Handling</p>
                            <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                                We found <span className="font-bold underline">{conflicts.length} duplicates</span>. Detailed list is disabled for stability.
                                Use the selector below if you wish to import them anyway.
                            </p>
                        </div>
                    </div>

                    <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-100 shadow-sm">
                            <label htmlFor="select-all-safe" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                Import these {conflicts.length} duplicates anyway
                            </label>
                            <Checkbox
                                id="select-all-safe"
                                checked={allSelected}
                                onCheckedChange={(checked) => selectAllConflicts(!!checked)}
                                className="w-6 h-6 border-2"
                            />
                        </div>
                        <p className="text-xs text-center text-slate-400 font-medium">
                            Unchecked = Skip duplicates (Recommended)<br />
                            Checked = Create duplicate entries
                        </p>
                    </div>

                    <div className="text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 w-full max-w-md">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Stability Mode Active</p>
                        <p className="text-[10px] text-slate-400 font-medium">Detailed transaction list is disabled for datasets {'>'} 300 to prevent browser crashes.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden mt-10">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="select-all"
                                checked={allSelected}
                                onCheckedChange={(checked) => selectAllConflicts(!!checked)}
                            />
                            <label htmlFor="select-all" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                Select all to import anyway
                            </label>
                        </div>
                        <Badge variant="outline" className="bg-white text-slate-500 font-mono text-[10px]">
                            {selectedConflictIds.size} of {conflicts.length} SELECTED
                        </Badge>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                        {conflicts.map((tx) => (
                            <div key={tx.id} className={cn(
                                "group flex items-center px-6 py-4 hover:bg-slate-50 transition-colors",
                                selectedConflictIds.has(tx.id) && "bg-amber-50/30"
                            )}>
                                <div className="flex items-center gap-4 flex-1">
                                    <Checkbox
                                        checked={selectedConflictIds.has(tx.id)}
                                        onCheckedChange={() => toggleConflictSelection(tx.id)}
                                    />
                                    <div className="grid grid-cols-4 gap-4 flex-1 items-center">
                                        <span className="text-xs font-mono text-slate-400">{formatDate(tx.date, userProfile?.show_time, userProfile?.date_format)}</span>
                                        <div className="col-span-2">
                                            <span className="text-sm font-bold text-slate-900 block truncate leading-tight">
                                                {tx.clean_source || tx.source}
                                            </span>
                                            <span className="text-[10px] text-slate-400 block truncate">{tx.category || 'No Category'}</span>
                                        </div>
                                        <span className={cn(
                                            "text-sm font-black text-right tabular-nums",
                                            tx.amount < 0 ? "text-slate-900" : "text-emerald-600"
                                        )}>
                                            {formatCurrency(tx.amount, settings.currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center pt-10 px-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(5)} className="text-slate-500 hover:bg-slate-100 font-bold h-12 px-8 rounded-xl tracking-tight">
                    <ChevronLeft className="w-5 h-5 mr-2" /> Back to Review
                </Button>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Ready to Import</p>
                        <p className="text-xs font-medium text-slate-600">Duplicates will be skipped unless selected.</p>
                    </div>
                    <Button
                        onClick={executeImport}
                        disabled={isProcessing}
                        size="lg"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 font-bold shadow-lg shadow-emerald-100 min-w-[200px]"
                    >
                        {isProcessing ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                        ) : (
                            <><CheckCircle2 className="w-5 h-5 mr-2" /> Complete Import</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
