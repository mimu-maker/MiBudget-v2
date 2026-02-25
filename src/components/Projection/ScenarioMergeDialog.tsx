import React, { useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { AlertCircle, ArrowRight, Plus } from 'lucide-react';

interface ScenarioMergeDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    scenarioName: string;
    scenarioProjections: any[];
    baselineProjections: any[];
    onApply: (saveBackup: boolean) => Promise<void>;
    isApplying: boolean;
}

export default function ScenarioMergeDialog({
    isOpen,
    onOpenChange,
    scenarioName,
    scenarioProjections,
    baselineProjections,
    onApply,
    isApplying
}: ScenarioMergeDialogProps) {
    const { settings } = useSettings();
    const [saveBackup, setSaveBackup] = useState(true);

    const changes = useMemo(() => {
        const differences: any[] = [];
        const newItems: any[] = [];

        scenarioProjections.forEach(sp => {
            const bp = baselineProjections.find(b => b.category === sp.category && b.stream === sp.stream && b.source === sp.source);

            if (!bp) {
                newItems.push(sp);
            } else if (
                bp.amount !== sp.amount ||
                bp.recurring !== sp.recurring ||
                bp.date !== sp.date ||
                JSON.stringify(bp.overrides) !== JSON.stringify(sp.overrides)
            ) {
                differences.push({ old: bp, new: sp });
            }
        });

        return { differences, newItems };
    }, [scenarioProjections, baselineProjections]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Apply Scenario to Budget</DialogTitle>
                    <DialogDescription>
                        You are about to merge <strong className="text-foreground">{scenarioName}</strong> into the official Budget Baseline.
                        This action will overwrite existing baseline projections with the scenario's values.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-[300px] border rounded-md px-1 mt-4">
                    <ScrollArea className="h-full px-3 py-4">
                        {changes.differences.length === 0 && changes.newItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                                <AlertCircle className="w-8 h-8 opacity-50" />
                                <p>No differences found between this scenario and the baseline.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 pb-4">
                                {changes.newItems.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3 text-emerald-600 flex items-center gap-2">
                                            <Plus className="w-4 h-4" /> New Additions
                                        </h4>
                                        <div className="space-y-2">
                                            {changes.newItems.map((item, i) => (
                                                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-sm">
                                                    <div>
                                                        <p className="font-medium text-emerald-900">{item.stream || item.source || item.category}</p>
                                                        <p className="text-xs text-emerald-600/70">{item.category} • {item.recurring}</p>
                                                    </div>
                                                    <div className="font-mono font-bold text-emerald-700">
                                                        {formatCurrency(item.amount, settings.currency)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {changes.differences.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3 text-blue-600 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Modified Projections
                                        </h4>
                                        <div className="space-y-2">
                                            {changes.differences.map((diff, i) => (
                                                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                                                    <div>
                                                        <p className="font-medium">{diff.new.stream || diff.new.source || diff.new.category}</p>
                                                        <p className="text-xs text-muted-foreground">{diff.new.category}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 font-mono text-xs">
                                                        <span className="text-muted-foreground line-through">
                                                            {formatCurrency(diff.old.amount, settings.currency)}
                                                        </span>
                                                        <ArrowRight className="w-3 h-3 text-slate-400" />
                                                        <span className="font-bold text-blue-600">
                                                            {formatCurrency(diff.new.amount, settings.currency)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between border-t pt-4 mt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="backup"
                            checked={saveBackup}
                            onCheckedChange={(c) => setSaveBackup(c as boolean)}
                        />
                        <label
                            htmlFor="backup"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                            Save current Baseline as a new Scenario
                        </label>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button onClick={() => onApply(saveBackup)} disabled={isApplying || (changes.differences.length === 0 && changes.newItems.length === 0)} className="w-full sm:w-auto">
                            {isApplying ? 'Applying...' : 'Apply Changes'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
