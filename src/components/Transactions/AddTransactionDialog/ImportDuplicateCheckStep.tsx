import { AlertTriangle, Check, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrency } from '@/lib/formatUtils';

interface ImportDuplicateCheckStepProps {
    conflicts: any[];
    selectedConflictIds: Set<string>;
    toggleConflictSelection: (id: string) => void;
    selectAllConflicts: (select: boolean) => void;
    setStep: (step: number) => void;
    executeImport: () => Promise<void>;
    isProcessing: boolean;
}

export const ImportDuplicateCheckStep = ({
    conflicts,
    selectedConflictIds,
    toggleConflictSelection,
    selectAllConflicts,
    setStep,
    executeImport,
    isProcessing
}: ImportDuplicateCheckStepProps) => {
    const { settings } = useSettings();
    const allSelected = conflicts.length > 0 && selectedConflictIds.size === conflicts.length;

    return (
        <div className="animate-in slide-in-from-right-4 fade-in max-w-4xl mx-auto space-y-6 py-8">
            <div className="text-center space-y-4">
                <div className="mx-auto bg-rose-100 p-5 rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-inner animate-pulse">
                    <AlertTriangle className="w-10 h-10 text-rose-600" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight">Potential Duplicates Found</h3>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                    We found <span className="text-rose-600 font-bold">{conflicts.length}</span> transactions that appear to already exist in your database.
                    By default, these will <span className="font-bold underline">not</span> be imported.
                </p>
            </div>

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
                                    <span className="text-xs font-mono text-slate-400">{tx.date}</span>
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
