import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MappingCard } from '../MappingCard';
import { transactionColumns } from '../hooks/useTransactionImport';
import { useSettings } from '@/hooks/useSettings';

interface ImportMappingStepProps {
    csvData: string[][];
    hasHeaders: boolean;
    setHasHeaders: (hasHeaders: boolean) => void;
    columnMapping: Record<string, string>;
    setColumnMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    fieldConfigs: Record<string, { dateFormat?: string, amountFormat?: string }>;
    setFieldConfigs: React.Dispatch<React.SetStateAction<Record<string, { dateFormat?: string, amountFormat?: string }>>>;
    setStep: (step: number) => void;
    generatePreview: () => void;
}

export const ImportMappingStep = ({
    csvData,
    hasHeaders,
    setHasHeaders,
    columnMapping,
    setColumnMapping,
    fieldConfigs,
    setFieldConfigs,
    setStep,
    generatePreview
}: ImportMappingStepProps) => {
    const { settings } = useSettings();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                <div>
                    <h3 className="text-xl font-bold text-blue-900 tracking-tight">Map Your Columns</h3>
                    <p className="text-sm text-blue-700 font-medium">We found <strong>{csvData.length - (hasHeaders ? 1 : 0)}</strong> transactions. Please map the fields below.</p>
                </div>
                <div className="flex items-center gap-6">
                    <Label className="flex items-center space-x-2 cursor-pointer group">
                        <input type="checkbox" checked={hasHeaders} onChange={(e) => setHasHeaders(e.target.checked)} className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 h-5 w-5 transition-all" />
                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700">First row is header</span>
                    </Label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
                {transactionColumns.map((field) => (
                    <MappingCard
                        key={field}
                        field={field}
                        mandatory={['date', 'merchant', 'amount'].includes(field)}
                        columnMapping={columnMapping}
                        setColumnMapping={setColumnMapping}
                        csvHeaders={hasHeaders ? csvData[0] : undefined}
                        csvSample={hasHeaders ? csvData[1] : csvData[0]}
                        fieldConfig={fieldConfigs[field]}
                        onConfigChange={(cfg) => setFieldConfigs(prev => ({ ...prev, [field]: { ...prev[field], ...cfg } }))}
                    />
                ))}
            </div>

            <div className="flex justify-between pt-8 border-t border-slate-200 mt-10">
                <Button variant="ghost" size="lg" onClick={() => setStep(1)} className="text-slate-500 hover:bg-slate-100"><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={generatePreview} size="lg" className="px-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100">Next: Preview <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>
        </div>
    );
};
