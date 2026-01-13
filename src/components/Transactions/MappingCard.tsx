
import { CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MappingCardProps {
    field: string;
    mandatory: boolean;
    columnMapping: Record<string, string>;
    setColumnMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    csvHeaders?: string[];
    csvSample?: string[];
}

export const MappingCard = ({ field, mandatory, columnMapping, setColumnMapping, csvHeaders, csvSample }: MappingCardProps) => {
    const currentMappedIdx = Object.entries(columnMapping).find(([_, f]) => f === field)?.[0];
    const isMapped = !!currentMappedIdx;

    return (
        <div className={cn(
            "bg-white p-4 rounded-xl border-2 transition-all shadow-sm group",
            isMapped ? "border-blue-200 bg-blue-50/30" : mandatory ? "border-slate-200 hover:border-red-200" : "border-slate-200 hover:border-blue-200"
        )}>
            <div className="flex justify-between items-start mb-2">
                <label className="text-sm font-semibold text-slate-700 capitalize flex items-center gap-1">
                    {field.replace(/([A-Z])/g, ' $1').trim()} {mandatory && <span className="text-red-500">*</span>}
                </label>
                {isMapped && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
            </div>

            <div className="space-y-2">
                <Select
                    value={currentMappedIdx || ''}
                    onValueChange={(val) => {
                        setColumnMapping(prev => {
                            const m = { ...prev };
                            // Remove if mapped to another, or remove this mapping if empty
                            // Actually, if we map '0' to 'date', we set m['0'] = 'date'.
                            // If 'date' was mapped to '1', we should delete m['1'].
                            Object.keys(m).forEach(k => { if (m[k] === field) delete m[k]; });

                            if (val && val !== 'skip') m[val] = field;
                            return m;
                        });
                    }}
                >
                    <SelectTrigger className={cn("w-full transition-colors", isMapped ? "bg-white border-blue-300" : "bg-slate-50 border-slate-200")}>
                        <SelectValue placeholder="Select Column..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="skip">-- Unmapped --</SelectItem>
                        {csvHeaders?.map((_, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>
                                {csvHeaders[idx]}
                                <span className="text-slate-400 ml-2 text-xs">({csvSample?.[idx] || ''})</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {isMapped && (
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="uppercase text-[10px] font-bold tracking-wider text-slate-400">Sample:</span>
                        <span className="font-mono bg-slate-100 px-1 rounded truncate max-w-[150px] inline-block align-bottom">{csvSample?.[parseInt(currentMappedIdx)] || '-'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
