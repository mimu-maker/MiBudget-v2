import { format } from 'date-fns';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrency, formatDate } from '@/lib/formatUtils';

interface ImportPreviewStepProps {
    preview: any[];
    columnMapping: Record<string, string>;
    setStep: (step: number) => void;
    checkForUnknownAccounts: () => void;
}

export const ImportPreviewStep = ({
    preview,
    columnMapping,
    setStep,
    checkForUnknownAccounts
}: ImportPreviewStepProps) => {
    const { settings } = useSettings();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-slate-100 p-4 rounded-xl border border-slate-200">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Data Preview</h3>
                    <p className="text-xs text-slate-500">Checking data validity based on your rules and formatting.</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-3 py-1 font-bold">{preview.length} Rows Ready</Badge>
            </div>

            <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {Object.entries(columnMapping).map(([idx, col]) => (
                                    <th key={`${idx}-${col}`} className="p-4 text-left font-bold text-slate-600 uppercase text-[10px] tracking-widest">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {preview.map((row, i) => (
                                <tr key={`row-${i}`} className="border-b last:border-0 border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    {Object.entries(columnMapping).map(([idx, col]) => {
                                        const isCategory = col === 'category' || col === 'sub_category';
                                        const hasSuggestion = isCategory && row[`suggested_${col}`] && row[`suggested_${col}`] !== row[col];

                                        return (
                                            <td key={`${idx}-${col}`} className="p-4 font-medium text-slate-700">
                                                {col === 'amount' ? (
                                                    <span className={cn("font-bold", row[col] < 0 ? "text-red-500" : "text-emerald-500")}>
                                                        {row[col] !== null ? formatCurrency(row[col], settings.currency) : 'Invalid'}
                                                    </span>
                                                ) : col === 'date' ? (
                                                    <span className={cn(!row[col] && "text-red-500 font-bold")}>
                                                        {row[col] ? formatDate(row[col]) : 'Invalid Date'}
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span>{row[col] || '-'}</span>
                                                        {hasSuggestion && (
                                                            <span className="text-xs text-blue-600 mt-1 flex items-center">
                                                                <span className="inline-block w-2 h-2 rounded-full bg-blue-300 mr-1"></span>
                                                                {row[`suggested_${col}`]}
                                                                <span className="text-xs text-blue-400 ml-1">
                                                                    ({Math.round((row.confidence || 0) * 100)}%)
                                                                </span>
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-between pt-8 border-t border-slate-200 mt-10">
                <Button variant="ghost" size="lg" onClick={() => setStep(2)} className="text-slate-500 hover:bg-slate-100"><ChevronLeft className="w-4 h-4 mr-2" /> Back to Mapping</Button>
                <Button onClick={checkForUnknownAccounts} size="lg" className="px-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-50 font-bold"><CheckCircle2 className="w-5 h-5 mr-2" /> Confirm & Import All</Button>
            </div>
        </div>
    );
};
