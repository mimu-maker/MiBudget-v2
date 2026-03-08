import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Transaction } from './hooks/useTransactionTable';
import { exportTransactions, ExportFormat } from '@/utils/exportUtils';
import { format } from 'date-fns';
import { Filter, ArrowDownUp, FileText, FileSpreadsheet, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportTransactionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transactions: Transaction[];
    filters: Record<string, any>;
    sortBy: keyof Transaction;
    sortOrder: 'asc' | 'desc';
}

export const ExportTransactionsDialog = ({
    open,
    onOpenChange,
    transactions,
    filters,
    sortBy,
    sortOrder,
}: ExportTransactionsDialogProps) => {
    const [filename, setFilename] = useState(`Transactions_Export_${format(new Date(), 'yyyyMMdd')}`);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');

    const handleExport = () => {
        exportTransactions(transactions, exportFormat, filename);
        onOpenChange(false);
    };

    const activeFilterCount = Object.keys(filters).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Export Transactions</DialogTitle>
                    <DialogDescription>
                        Download your transactions data. Active filters and sorting will be applied to the export.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex flex-col gap-3 rounded-md bg-slate-50 p-4 border border-slate-100">
                        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-500" />
                            Dataset Summary
                        </h4>
                        <div className="flex flex-col gap-1.5 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Rows to export:</span>
                                <span className="font-medium text-slate-900">{transactions.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Active filters:</span>
                                <span className={cn("font-medium", activeFilterCount > 0 ? "text-indigo-600" : "text-slate-900")}>
                                    {activeFilterCount > 0 ? `${activeFilterCount} applied` : 'None'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-slate-500">
                                    <ArrowDownUp className="w-3.5 h-3.5" />
                                    Sorted by:
                                </span>
                                <span className="font-medium text-slate-900 capitalize">
                                    {sortBy} ({sortOrder})
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Label htmlFor="filename" className="text-slate-900 font-semibold">
                            File Name
                        </Label>
                        <Input
                            id="filename"
                            value={filename}
                            onChange={(e) => setFilename(e.target.value)}
                            className="h-10 transition-colors duration-200"
                            placeholder="Enter file name"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <Label className="text-slate-900 font-semibold">Export Format</Label>
                        <RadioGroup
                            value={exportFormat}
                            onValueChange={(val) => setExportFormat(val as ExportFormat)}
                            className="grid grid-cols-1 gap-2"
                        >
                            <Label
                                htmlFor="format-csv"
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors duration-200 hover:bg-slate-50",
                                    exportFormat === 'csv' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200"
                                )}
                            >
                                <RadioGroupItem value="csv" id="format-csv" />
                                <FileText className={cn("w-5 h-5", exportFormat === 'csv' ? "text-indigo-600" : "text-slate-400")} />
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-slate-900">CSV Document</span>
                                    <span className="text-xs text-slate-500 font-normal">Standard comma-separated format</span>
                                </div>
                            </Label>
                            <Label
                                htmlFor="format-excel"
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors duration-200 hover:bg-slate-50",
                                    exportFormat === 'excel' ? "border-green-600 bg-green-50/50" : "border-slate-200"
                                )}
                            >
                                <RadioGroupItem value="excel" id="format-excel" />
                                <FileSpreadsheet className={cn("w-5 h-5", exportFormat === 'excel' ? "text-green-600" : "text-slate-400")} />
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-slate-900">Excel Workbook</span>
                                    <span className="text-xs text-slate-500 font-normal">Spreadsheet with columns (.xlsx)</span>
                                </div>
                            </Label>
                            <Label
                                htmlFor="format-pdf"
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors duration-200 hover:bg-slate-50",
                                    exportFormat === 'pdf' ? "border-rose-600 bg-rose-50/50" : "border-slate-200"
                                )}
                            >
                                <RadioGroupItem value="pdf" id="format-pdf" />
                                <File className={cn("w-5 h-5", exportFormat === 'pdf' ? "text-rose-600" : "text-slate-400")} />
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-slate-900">PDF Document</span>
                                    <span className="text-xs text-slate-500 font-normal">Formatted table for printing</span>
                                </div>
                            </Label>
                        </RadioGroup>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleExport} className="gap-2">
                        <Filter className="w-4 h-4" />
                        Export Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
