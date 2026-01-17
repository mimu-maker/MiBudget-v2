import { ArrowRight, CheckCircle2, ChevronDown, FileText, AlertTriangle, Settings2, HelpCircle, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { parseDate, parseAmount } from '@/lib/importUtils';

interface MappingCardProps {
    field: string;
    mandatory: boolean;
    columnMapping: Record<string, string>;
    setColumnMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    csvHeaders?: string[];
    csvSample?: string[];
    fieldConfig?: { dateFormat?: string, amountFormat?: string };
    onConfigChange?: (config: { dateFormat?: string, amountFormat?: string }) => void;
}

export const MappingCard = ({
    field,
    mandatory,
    columnMapping,
    setColumnMapping,
    csvHeaders,
    csvSample,
    fieldConfig,
    onConfigChange
}: MappingCardProps) => {
    const currentMappedIdx = Object.entries(columnMapping).find(([_, f]) => f === field)?.[0];
    const isMapped = !!currentMappedIdx;

    const sampleValue = isMapped ? csvSample?.[parseInt(currentMappedIdx!)] : undefined;

    let isValid = true;
    if (isMapped && sampleValue) {
        if (field === 'date') isValid = parseDate(sampleValue) !== null;
        if (field === 'amount') isValid = parseAmount(sampleValue) !== null;
    }

    // Determine status color
    const statusColor = isMapped
        ? isValid ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
        : mandatory
            ? "bg-rose-50 border-rose-200"
            : "bg-slate-50 border-slate-200";

    const labelColor = isMapped
        ? isValid ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"
        : mandatory
            ? "text-rose-600 font-bold"
            : "text-slate-500 font-medium";

    const hasSettings = field === 'date' || field === 'amount';

    return (
        <div className={cn("p-4 rounded-xl border transition-all shadow-sm group hover:shadow-md", statusColor)}>
            <div className="flex items-center justify-between gap-4">

                {/* LEFT: Import Data (Target Column) */}
                <div className="flex-1 min-w-0">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Import Column (CSV)</Label>
                    <Select
                        value={currentMappedIdx || 'skip'}
                        onValueChange={(val) => {
                            setColumnMapping(prev => {
                                const m = { ...prev };
                                Object.keys(m).forEach(k => { if (m[k] === field) delete m[k]; });
                                if (val && val !== 'skip') m[val] = field;
                                return m;
                            });
                        }}
                    >
                        <SelectTrigger className="w-full h-9 bg-white border-slate-200 text-sm">
                            <SelectValue placeholder="Select Column..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="skip" className="text-slate-400 italic">-- Not Mapped --</SelectItem>
                            {csvHeaders?.map((header, idx) => (
                                <SelectItem key={idx} value={idx.toString()}>
                                    <span className="font-medium text-slate-700 block truncate max-w-[180px]">{header}</span>
                                    {csvSample?.[idx] && (
                                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px] mt-0.5">Eg: {csvSample[idx]}</span>
                                    )}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* MIDDLE: Arrow */}
                <div className="flex items-center justify-center pt-4">
                    <ArrowRight className={cn("w-4 h-4", isMapped ? (isValid ? "text-emerald-500" : "text-amber-500") : "text-slate-300")} />
                </div>

                {/* RIGHT: App Field */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="flex-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">App Field</Label>
                        <div className={cn("h-9 px-3 rounded-md border flex items-center justify-between bg-white/50",
                            isMapped ? (isValid ? "border-emerald-200" : "border-amber-200") : mandatory ? "border-rose-200" : "border-slate-200"
                        )}>
                            <span className={cn("capitalize text-sm truncate", labelColor)}>
                                {field === 'budgetYear' ? 'Budget Year' : field.replace(/([A-Z])/g, ' $1').trim()}
                                {mandatory && !isMapped && <span className="ml-1 text-rose-500">*</span>}
                            </span>
                            {isMapped && isValid && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            {isMapped && !isValid && <XCircle className="w-4 h-4 text-amber-500 shadow-sm" />}
                            {mandatory && !isMapped && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                        </div>
                    </div>

                    {/* Settings Icon (Only for Date/Amount) */}
                    {hasSettings && isMapped && onConfigChange && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 mt-5 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                    <Settings2 className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="end">
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <Settings2 className="w-3.5 h-3.5" />
                                        Trim Parsing
                                    </h4>

                                    {field === 'date' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Source Date Format</Label>
                                            <Select value={fieldConfig?.dateFormat || 'auto'} onValueChange={(v) => onConfigChange({ dateFormat: v })}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="auto">Auto-detect (Default)</SelectItem>
                                                    <SelectItem value="dd-mm-yyyy">Danish (31-01-2024)</SelectItem>
                                                    <SelectItem value="mm-dd-yyyy">International (01-31-2024)</SelectItem>
                                                    <SelectItem value="yyyy-mm-dd">ISO (2024-01-31)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {field === 'amount' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500">Source Number Format</Label>
                                            <Select value={fieldConfig?.amountFormat || 'auto'} onValueChange={(v) => onConfigChange({ amountFormat: v })}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="auto">Auto-detect (Default)</SelectItem>
                                                    <SelectItem value="eu">Danish (1.234,56)</SelectItem>
                                                    <SelectItem value="us">International (1,234.56)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>

            {/* Sample Preview */}
            {isMapped && (
                <div className="mt-2 text-xs flex items-center justify-between pl-1">
                    <div className="text-slate-400">
                        Value to import: <span className={cn("font-mono px-1.5 py-0.5 rounded border shadow-sm",
                            isValid ? "text-slate-600 bg-white border-slate-100" : "text-amber-700 bg-amber-100 border-amber-200 font-bold")}>
                            {sampleValue || 'N/A'}
                        </span>
                    </div>
                    {!isValid && (
                        <Badge variant="outline" className="text-[10px] bg-amber-100 border-amber-200 text-amber-700 font-bold flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" /> Invalid Format
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
};

