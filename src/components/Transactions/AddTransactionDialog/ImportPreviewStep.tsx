import { useMemo } from 'react';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/hooks/useSettings';
import { TriageAccordion } from '../TriageAccordion';
import { useCategories } from '@/hooks/useAnnualBudget';

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
