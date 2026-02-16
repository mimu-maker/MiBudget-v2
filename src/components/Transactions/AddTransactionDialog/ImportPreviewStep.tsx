import { useMemo, useState } from 'react';
import { ChevronLeft, CheckCircle2, AlertTriangle, FileText, Calendar, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSettings } from '@/hooks/useSettings';
import { TriageAccordion } from '../TriageAccordion';
import { useCategories } from '@/hooks/useAnnualBudget';
import { cn } from '@/lib/utils';

interface ImportPreviewStepProps {
    preview: any[];
    setStep: (step: number) => void;
    checkForUnknownAccounts: () => void;
    updatePreviewRow: (id: string, updates: any) => void;
    bulkUpdatePreview: (ids: string[], updates: any) => void;
    applyRuleToPreview: (rule: any) => void;
    onDelete?: (id: string) => void;
    onBulkDelete?: (ids: string[]) => void;
    onKeep?: (id: string) => void;
}

export const ImportPreviewStep = ({
    preview,
    setStep,
    checkForUnknownAccounts,
    updatePreviewRow,
    bulkUpdatePreview,
    applyRuleToPreview,
    onDelete,
    onBulkDelete,
    onKeep
}: ImportPreviewStepProps) => {
    const { settings } = useSettings();
    const { categories } = useCategories();

    const categoryNames = useMemo(() => {
        const fromDb = categories.map((c: any) => c.name);
        const fromPreview = Array.from(new Set(preview.map(tx => tx.category).filter(Boolean)));
        return Array.from(new Set([...fromDb, ...fromPreview])).sort();
    }, [categories, preview]);

    const getSubCategoryList = (cat: string) => {
        const category = categories.find((c: any) => c.name === cat);
        const fromDb = category ? (category.sub_categories || []).map((s: any) => s.name) : [];
        const fromPreview = Array.from(new Set(
            preview
                .filter(tx => tx.category === cat)
                .map(tx => tx.sub_category)
                .filter(Boolean)
        ));
        return Array.from(new Set([...fromDb, ...fromPreview])).sort();
    };

    // New logic for preventing crashes on large datasets
    const isLargeDataset = preview.length > 300;
    const [showFullPreview, setShowFullPreview] = useState(!isLargeDataset);

    // Calculate summary stats for the "Safe Mode" card
    const summaryStats = useMemo(() => {
        if (!isLargeDataset) return null;
        const totalAmount = preview.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

        const dates = preview
            .map(tx => tx.date ? new Date(tx.date) : null)
            .filter(Boolean) as Date[];

        let dateRange = "N/A";
        if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
            dateRange = `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
        }

        const uniqueSources = new Set(preview.map(tx => tx.source)).size;

        // Category breakdown
        const catMap: Record<string, { amount: number, count: number }> = {};
        preview.forEach(tx => {
            const cat = tx.category || "Uncategorized";
            if (!catMap[cat]) catMap[cat] = { amount: 0, count: 0 };
            catMap[cat].amount += (Number(tx.amount) || 0);
            catMap[cat].count += 1;
        });

        const categoryBreakdown = Object.entries(catMap)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

        return { totalAmount, dateRange, uniqueSources, categoryBreakdown };
    }, [preview, isLargeDataset]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-slate-100 p-4 rounded-xl border border-slate-200">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Review & Triage</h3>
                    <p className="text-xs text-slate-500">All data has been pre-processed. Fix any issues before importing.</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-3 py-1 font-bold">{preview.length} Rows Prepared</Badge>
            </div>

            <div className="min-h-[400px]">
                {!showFullPreview && summaryStats ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-8 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative">
                        {/* Decorative background accent */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />

                        <div className="text-center space-y-2 max-w-md">
                            <div className="bg-amber-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <AlertTriangle className="w-8 h-8 text-amber-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Direct Import Summary</h3>
                            <p className="text-slate-500 text-sm font-medium">
                                We've simplified the view to prevent performance issues with your <span className="text-blue-600 font-bold">{preview.length} items</span>.
                            </p>
                        </div>

                        <div className="w-full max-w-2xl space-y-6">
                            {/* High-level stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center shadow-sm">
                                    <Calendar className="w-4 h-4 text-blue-500 mb-1" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</span>
                                    <span className="text-xs font-bold text-slate-700">{summaryStats.dateRange}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center shadow-sm">
                                    <FileText className="w-4 h-4 text-emerald-500 mb-1" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sources</span>
                                    <span className="text-xs font-bold text-slate-700">{summaryStats.uniqueSources} Distinct</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center shadow-sm">
                                    <Wallet className="w-4 h-4 text-purple-500 mb-1" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Value</span>
                                    <span className="text-xs font-black text-slate-900">
                                        {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(summaryStats.totalAmount)}
                                    </span>
                                </div>
                            </div>

                            {/* Category Summary - The requested feature */}
                            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden shadow-inner">
                                <div className="bg-slate-200/50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category Breakdown</span>
                                    <span className="text-[10px] font-bold text-slate-400 italic">No expansion available in Safe Mode</span>
                                </div>
                                <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100 p-2">
                                    {summaryStats.categoryBreakdown.map((cat, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-2 px-3 hover:bg-white rounded-lg transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 leading-tight">{cat.name}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{cat.count} transactions</span>
                                            </div>
                                            <span className={cn(
                                                "font-mono font-black text-xs",
                                                cat.amount < 0 ? "text-slate-700" : "text-emerald-600"
                                            )}>
                                                {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(cat.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 w-full max-w-md pt-4">
                            <Button
                                onClick={checkForUnknownAccounts}
                                size="lg"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-100 font-black uppercase tracking-widest h-14 text-base"
                            >
                                <CheckCircle2 className="w-6 h-6 mr-3" />
                                Complete Import Now
                            </Button>
                            <p className="text-xs text-center text-slate-400 font-medium leading-relaxed">
                                Choose this to save everything as "Pending Triage".<br />
                                You can refine categories safely in the main dashboard.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {isLargeDataset && (
                            <Alert className="mb-6 border-amber-200 bg-amber-50">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800 font-bold">Performance Warning</AlertTitle>
                                <AlertDescription className="text-amber-700">
                                    Displaying {preview.length} transactions at once may slow down your browser.
                                    If it becomes unresponsive, refresh the page and choose "Import All" instead.
                                </AlertDescription>
                            </Alert>
                        )}
                        <TriageAccordion
                            transactions={preview}
                            onVerifySingle={(tx, cat, sub) => {
                                const finalCat = cat || tx.category;
                                const finalSub = sub || tx.sub_category;
                                const isExcluded = tx.excluded || tx.budget === 'Exclude' || tx.auto_budget === 'Exclude';
                                updatePreviewRow(tx.id, {
                                    category: finalCat,
                                    sub_category: finalSub,
                                    status: (isExcluded || (finalCat && finalSub)) ? 'Complete' : 'Pending Triage'
                                });
                            }}
                            onSaveRule={(rule) => {
                                // In import preview, we just apply the rule locally to the preview set
                                applyRuleToPreview(rule);
                            }}
                            onBulkUpdate={bulkUpdatePreview}
                            onSplit={(tx) => {
                                // For now we don't support splitting in the preview
                                console.log('Split skip in preview', tx);
                            }}
                            onDelete={onDelete}
                            onBulkDelete={onBulkDelete}
                            onKeep={onKeep}
                            onUpdateRow={updatePreviewRow}
                            categoryList={categoryNames}
                            getSubCategoryList={getSubCategoryList}
                            mode="import"
                        />
                    </>
                )}
            </div>

            <div className="flex justify-between pt-8 border-t border-slate-200 mt-10">
                <Button variant="ghost" size="lg" onClick={() => setStep(4)} className="text-slate-500 hover:bg-slate-100 font-bold h-12 px-8 rounded-xl tracking-tight">
                    <ChevronLeft className="w-5 h-5 mr-2" /> Back to Mapping
                </Button>
                <Button onClick={checkForUnknownAccounts} size="lg" className="px-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-50 font-bold"><CheckCircle2 className="w-5 h-5 mr-2" /> Continue to Import</Button>
            </div>
        </div>
    );
};
