
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileText, Clipboard, AlertCircle, Archive, ArrowRight, CheckCircle2, AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { processTransaction, MerchantRule } from '@/lib/importBrain';
import { parseDate, parseAmount } from '@/lib/importUtils';
import { useQuery } from '@tanstack/react-query';
import { useSettings } from '@/hooks/useSettings';
import { MappingCard } from './MappingCard';

interface UnifiedAddTransactionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (transaction: any) => void;
    onImport: (data: any[]) => void;
}

const transactionColumns = [
    'date', 'merchant', 'amount', 'account', 'status',
    'budget', 'category', 'subCategory', 'planned', 'recurring', 'description', 'budgetYear'
];

export const UnifiedAddTransactionsDialog = ({ open, onOpenChange, onAdd, onImport }: UnifiedAddTransactionsDialogProps) => {
    const { settings, addItem } = useSettings();

    // High-level mode: 'entry' or 'import'
    const [mode, setMode] = useState<'entry' | 'import'>('entry');
    const [importSource, setImportSource] = useState<'upload' | 'paste'>('upload');

    // --- MANUAL ENTRY STATE ---
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        merchant: '',
        amount: '',
        account: settings.accounts[0] || 'Master',
        status: 'Complete',
        budget: 'Budgeted',
        category: settings.categories[0] || 'Other',
        subCategory: '',
        planned: false,
        recurring: false,
        description: ''
    });

    // --- IMPORT STATE ---
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [hasHeaders, setHasHeaders] = useState(true);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [fieldConfigs, setFieldConfigs] = useState<Record<string, { dateFormat?: string, amountFormat?: string }>>({});
    const [errors, setErrors] = useState<string[]>([]);
    const [preview, setPreview] = useState<any[]>([]);
    const [trustCsvCategories, setTrustCsvCategories] = useState(false);
    const [pasteContent, setPasteContent] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [defaultAccount, setDefaultAccount] = useState<string>('');
    const [unknownAccounts, setUnknownAccounts] = useState<string[]>([]);
    const [accountResolutions, setAccountResolutions] = useState<Record<string, string>>({});

    // Fetch rules
    const { data: rulesData, error: rulesError, isError: isRulesError } = useQuery({
        queryKey: ['merchant_rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('merchant_rules')
                .select('*');
            if (error) {
                console.error("Supabase error fetching rules:", error);
                throw error;
            }
            return data || [];
        },
        retry: 1
    });
    const rules = rulesData || [];

    // Reset state on open/close
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setStep(1);
                setCsvData([]);
                setPreview([]);
                setErrors([]);
                setColumnMapping({});
                setUnknownAccounts([]);
                setIsProcessing(false);
                setDefaultAccount('');
                setMode('entry');
            }, 300);
        }
    }, [open]);

    // --- MANUAL ENTRY HANDLER ---
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsProcessing(true);
            await onAdd({
                ...formData,
                amount: parseFloat(formData.amount) || 0
            });
            onOpenChange(false);
            // Reset form
            setFormData({
                date: new Date().toISOString().split('T')[0],
                merchant: '',
                amount: '',
                account: settings.accounts[0] || 'Master',
                status: 'Complete',
                budget: 'Budgeted',
                category: settings.categories[0] || 'Other',
                subCategory: '',
                planned: false,
                recurring: false,
                description: ''
            });
        } catch (err: any) {
            setErrors([`Failed to add transaction: ${err.message}`]);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- IMPORT LOGIC ---
    const parseCSV = (text: string) => {
        setIsProcessing(true);
        setTimeout(() => {
            try {
                if (!text.trim()) {
                    setIsProcessing(false);
                    return;
                }
                const firstLine = text.split(/\r?\n/)[0];
                let delimiter = ',';
                if (firstLine.includes(';')) delimiter = ';';
                else if (firstLine.includes('\t')) delimiter = '\t';
                else if (firstLine.includes('|')) delimiter = '|';

                const rows = text.split(/\r?\n/).map(row => {
                    // Split by delimiter but ignore delimiters inside quotes
                    // Regex: Match delimiter followed by an even number of quotes (meaning we are outside quotes)
                    const escapeDelim = (d: string) => d === '\\t' ? '\\t' : `\\${d}`;
                    const customSplit = new RegExp(`${escapeDelim(delimiter)}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
                    return row.split(customSplit).map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                }).filter(row => row.length > 1 && row.some(cell => cell.length > 0));

                if (rows.length === 0) {
                    setErrors(["No valid data found"]);
                    setIsProcessing(false);
                    return;
                }

                setCsvData(rows);
                setErrors([]);

                const firstRow = rows[0];
                const hasHeadersDetected = firstRow.some(cell =>
                    transactionColumns.some(col =>
                        cell.toLowerCase().includes(col.toLowerCase())
                    )
                );
                setHasHeaders(hasHeadersDetected);

                if (hasHeadersDetected) {
                    const autoMapping: Record<string, string> = {};
                    const usedFields = new Set<string>();
                    firstRow.forEach((header, index) => {
                        const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '');
                        const match = transactionColumns.find(col =>
                            (col.toLowerCase().includes(normalizedHeader) ||
                                normalizedHeader.includes(col.toLowerCase())) &&
                            !usedFields.has(col)
                        );
                        if (match) {
                            autoMapping[index.toString()] = match;
                            usedFields.add(match);
                        }
                    });
                    setColumnMapping(autoMapping);
                }
                setStep(2);
            } catch (e) {
                setErrors(["Failed to parse data."]);
            } finally {
                setIsProcessing(false);
            }
        }, 100);
    };

    const readFile = (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => parseCSV(e.target?.result as string);
        reader.onerror = () => {
            setErrors(["Failed to read file"]);
            setIsProcessing(false);
        }
        reader.readAsText(file);
    };

    const generatePreview = () => {
        if (csvData.length === 0) return;
        setIsProcessing(true);
        setTimeout(() => {
            try {
                const dataRows = hasHeaders ? csvData.slice(1) : csvData;
                const previewRows = dataRows.slice(0, 5);
                const newErrors: string[] = [];

                const previewData = previewRows.map((row, rowIndex) => {
                    const transaction: any = { id: rowIndex.toString() };
                    Object.entries(columnMapping).forEach(([csvIndex, transactionField]) => {
                        const indexNum = parseInt(csvIndex);
                        if (indexNum < row.length) {
                            const value = row[indexNum];

                            if (transactionField === 'amount') {
                                const parsed = parseAmount(value);
                                if (parsed === null) {
                                    newErrors.push(`Row ${rowIndex + 1}: Could not read amount "${value}"`);
                                }
                                transaction[transactionField] = parsed;
                            } else if (transactionField === 'date') {
                                const parsed = parseDate(value);
                                if (parsed === null) {
                                    newErrors.push(`Row ${rowIndex + 1}: Date format "${value}" was not readable`);
                                }
                                transaction[transactionField] = parsed;
                            } else {
                                transaction[transactionField] = value || '';
                            }
                        }
                    });
                    if (!transaction.account && defaultAccount) transaction.account = defaultAccount;
                    return transaction;
                });

                setPreview(previewData);

                if (!Object.values(columnMapping).includes('merchant')) newErrors.push("Missing 'merchant' mapping (Who did you pay?)");
                if (!Object.values(columnMapping).includes('amount')) newErrors.push("Missing 'amount' mapping");
                if (!Object.values(columnMapping).includes('account') && !defaultAccount) newErrors.push("Missing 'account' mapping");

                setErrors(newErrors);
                if (newErrors.length === 0) setStep(3);
            } finally {
                setIsProcessing(false);
            }
        }, 100);
    };

    const checkForUnknownAccounts = () => {
        if (errors.length > 0) return;
        setIsProcessing(true);
        setTimeout(() => {
            const dataRows = hasHeaders ? csvData.slice(1) : csvData;
            const accountColIndex = Object.entries(columnMapping).find(([_, field]) => field === 'account')?.[0];

            if (!accountColIndex) {
                if (defaultAccount) executeImport();
                else setErrors(["No account selected"]);
                return;
            }

            const foundAccounts = new Set<string>();
            dataRows.forEach(row => {
                if (row[parseInt(accountColIndex)]) foundAccounts.add(row[parseInt(accountColIndex)]);
            });

            const unknown = Array.from(foundAccounts).filter(acc => !settings.accounts.includes(acc));
            if (unknown.length > 0) {
                setUnknownAccounts(unknown);
                setStep(4);
                setIsProcessing(false);
            } else {
                executeImport();
            }
        }, 100);
    };

    const executeImport = async () => {
        setIsProcessing(true);
        setErrors([]);

        // Use a short delay to allow the processing animation to show
        setTimeout(async () => {
            try {
                const dataRows = hasHeaders ? csvData.slice(1) : csvData;
                if (dataRows.length === 0) {
                    throw new Error("No data rows found to import.");
                }

                const importErrors: string[] = [];
                const merchantColIdx = Object.entries(columnMapping).find(([_, f]) => f === 'merchant')?.[0];

                const processedData = await Promise.all(dataRows.map(async (row, index) => {
                    const transaction: any = {
                        id: crypto.randomUUID(), // Use robust UUIDs
                        date: new Date().toISOString().split('T')[0],
                        merchant: '',
                        amount: 0,
                        account: defaultAccount,
                        status: 'New',
                        budget: 'Budgeted',
                        category: 'Other',
                        subCategory: '',
                        planned: false,
                        recurring: false,
                        description: ''
                    };

                    Object.entries(columnMapping).forEach(([csvIndex, transactionField]) => {
                        const indexNum = parseInt(csvIndex);
                        if (indexNum < row.length) {
                            const value = row[indexNum];

                            if (transactionField === 'amount') {
                                const parsed = parseAmount(value);
                                if (parsed === null) {
                                    if (importErrors.length < 10) importErrors.push(`Row ${index + 1}: Invalid amount format "${value}"`);
                                }
                                transaction[transactionField] = parsed || 0;
                            } else if (transactionField === 'date') {
                                const parsed = parseDate(value);
                                if (parsed === null) {
                                    if (importErrors.length < 10) importErrors.push(`Row ${index + 1}: Invalid date format "${value}"`);
                                }
                                transaction[transactionField] = parsed || transaction.date;
                            } else {
                                transaction[transactionField] = value || '';
                            }
                        }
                    });

                    // Handle account mapping from resolutions or default
                    const rawAccount = transaction.account || "";
                    if (rawAccount && accountResolutions[rawAccount]) {
                        transaction.account = accountResolutions[rawAccount];
                    } else if (!rawAccount || !settings.accounts.includes(rawAccount)) {
                        transaction.account = defaultAccount || settings.accounts[0] || 'Master';
                    }

                    // CRITICAL: use 'merchant' field for processing rules, fallback to 'description'
                    const identificationString = (transaction.merchant || transaction.description || "").trim();
                    let processed = processTransaction(identificationString, transaction.date, rules as MerchantRule[]);

                    if (trustCsvCategories && transaction.category) {
                        processed = { ...processed, category: transaction.category, sub_category: transaction.subCategory || processed.sub_category };
                    }
                    return { ...transaction, ...processed };
                }));

                if (importErrors.length > 0) {
                    setErrors(importErrors);
                    setIsProcessing(false);
                    return;
                }

                if (processedData.length === 0) {
                    throw new Error("Processing failed: No transactions generated.");
                }

                // Final safety check: try to call onImport and catch any internal errors
                try {
                    console.log(`Importing ${processedData.length} transactions...`);
                    await onImport(processedData);
                    console.log("Import successful!");
                    onOpenChange(false);
                } catch (importFnError: any) {
                    console.error("onImport failed:", importFnError);
                    setErrors([`Database error: ${importFnError.message || "Failed to save transactions"}`]);
                }

            } catch (err: any) {
                console.error("Import execution failed:", err);
                setErrors([`Execution error: ${err.message || "An unexpected error occurred during import"}`]);
            } finally {
                setIsProcessing(false);
            }
        }, 300); // 300ms delay to ensure UI transition is smooth
    };

    const handleResolutionSave = () => {
        console.log("Saving account resolutions:", accountResolutions);
        Object.values(accountResolutions).forEach(targetAcc => {
            if (!settings.accounts.includes(targetAcc)) {
                console.log(`Adding new account to settings: ${targetAcc}`);
                addItem('accounts', targetAcc);
            }
        });
        executeImport();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn("bg-slate-50 transition-all duration-300", mode === 'import' && step > 1 ? "w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto" : "max-w-2xl")}>
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-semibold">{mode === 'entry' ? 'Add New Transaction' : 'Import Transactions'}</DialogTitle>
                        {mode === 'import' && <div className="text-sm text-slate-500">Step {step} of 4</div>}
                    </div>
                    {errors.length > 0 && (
                        <Alert variant="destructive" className="mt-4 animate-in fade-in slide-in-from-top-2 border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="font-bold">Attention Needed</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                                <Button variant="link" size="sm" onClick={() => setErrors([])} className="p-0 h-auto mt-2 text-red-700 font-bold decoration-red-700">Clear errors and try again</Button>
                            </AlertDescription>
                        </Alert>
                    )}
                    {isRulesError && (
                        <Alert className="mt-4 border-amber-200 bg-amber-50">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800">Rule Matching Offline</AlertTitle>
                            <AlertDescription className="text-amber-700 text-xs text-balance">
                                We couldn't load your auto-categorization rules. Import will still work, but you'll have to categorize manually.
                            </AlertDescription>
                        </Alert>
                    )}
                </DialogHeader>

                {mode === 'entry' ? (
                    <div className="space-y-6">
                        <Tabs defaultValue="form" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-200 p-1 rounded-lg">
                                <TabsTrigger value="form" className="flex items-center gap-2 font-medium tracking-tight"><Plus className="w-4 h-4" /> Single Transaction</TabsTrigger>
                                <TabsTrigger value="bulk" onClick={() => setMode('import')} className="flex items-center gap-2 font-medium tracking-tight"><FileText className="w-4 h-4" /> Bulk Import</TabsTrigger>
                            </TabsList>

                            <form onSubmit={handleManualSubmit} className="space-y-5 animate-in fade-in duration-500">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Date</Label>
                                        <Input id="date" type="date" className="bg-white border-slate-200 focus:ring-blue-500" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="amount" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Amount (DKK)</Label>
                                        <Input id="amount" type="number" step="0.01" className="bg-white border-slate-200 focus:ring-blue-500" value={formData.amount} onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="merchant" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Merchant</Label>
                                    <Input id="merchant" className="bg-white border-slate-200 focus:ring-blue-500 h-11 text-lg" placeholder="e.g. Amazon, Supermarket..." value={formData.merchant} onChange={(e) => setFormData(p => ({ ...p, merchant: e.target.value }))} required />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Account</Label>
                                        <Select value={formData.account} onValueChange={(v) => setFormData(p => ({ ...p, account: v }))}>
                                            <SelectTrigger className="bg-white border-slate-200"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {settings.accounts.map(acc => (
                                                    <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Category</Label>
                                        <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                                            <SelectTrigger className="bg-white border-slate-200"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {settings.categories.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Sub-category</Label>
                                        <Input
                                            className="bg-white border-slate-200 focus:ring-blue-500"
                                            value={formData.subCategory}
                                            onChange={(e) => setFormData(p => ({ ...p, subCategory: e.target.value }))}
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8 py-2">
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-bold text-slate-700">Planned</Label>
                                            <p className="text-[10px] text-slate-400 font-medium">Is this a future expense?</p>
                                        </div>
                                        <Switch
                                            checked={formData.planned}
                                            onCheckedChange={(v) => setFormData(p => ({ ...p, planned: v }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-bold text-slate-700">Recurring</Label>
                                            <p className="text-[10px] text-slate-400 font-medium">Does this repeat?</p>
                                        </div>
                                        <Switch
                                            checked={formData.recurring}
                                            onCheckedChange={(v) => setFormData(p => ({ ...p, recurring: v }))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        className="bg-white border-slate-200 focus:ring-blue-500"
                                        value={formData.description}
                                        onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Add any additional details or notes..."
                                    />
                                </div>

                                <div className="flex justify-end pt-6 border-t border-slate-200 mt-6">
                                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="mr-3 text-slate-500 hover:text-slate-800">Cancel</Button>
                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 font-semibold shadow-lg shadow-blue-100">Add Transaction</Button>
                                </div>
                            </form>
                        </Tabs>
                    </div>
                ) : (
                    <div className="mt-4 min-h-[400px] relative">
                        {/* Step 1: Source */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <Tabs defaultValue="upload" value={importSource} onValueChange={(v: any) => setImportSource(v)} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-200 p-1 rounded-xl max-sm mx-auto shadow-inner">
                                        <TabsTrigger value="upload" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm"><Upload className="w-4 h-4" /> Upload File</TabsTrigger>
                                        <TabsTrigger value="paste" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm"><Clipboard className="w-4 h-4" /> Paste Data</TabsTrigger>
                                    </TabsList>

                                    <div className="max-w-2xl mx-auto">
                                        {importSource === 'upload' ? (
                                            <div
                                                className={cn("bg-white border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:border-blue-400 group h-[280px] shadow-sm", isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-300")}
                                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                                onDragLeave={() => setIsDragOver(false)}
                                                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
                                            >
                                                <div className="bg-blue-50 p-5 rounded-full mb-5 group-hover:bg-blue-100 transition-colors shadow-sm animate-bounce-subtle">
                                                    <Upload className="w-10 h-10 text-blue-600" />
                                                </div>
                                                <p className="text-xl font-bold text-slate-800 mb-2">Drag & drop CSV file here</p>
                                                <p className="text-slate-500 mb-6 text-sm">Or click browse to select a file from your computer</p>
                                                <input type="file" accept=".csv,.txt" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} className="hidden" id="file-upload" />
                                                <label htmlFor="file-upload"><Button variant="outline" size="lg" className="border-blue-200 text-blue-700 hover:bg-blue-50 pointer-events-none px-10">Browse Files</Button></label>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 h-[320px] shadow-sm flex flex-col">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-slate-700 font-bold">Paste Data</Label>
                                                    <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">CSV or Excel Format</span>
                                                </div>
                                                <Textarea
                                                    placeholder="Date, Description, Amount...&#10;2026-01-15, Sample Item, -100.00"
                                                    className="flex-1 font-mono text-xs leading-relaxed border-slate-200 focus:ring-blue-500 bg-slate-50 mt-1"
                                                    value={pasteContent}
                                                    onChange={(e) => setPasteContent(e.target.value)}
                                                />
                                                <div className="flex justify-end pt-2">
                                                    <Button onClick={() => parseCSV(pasteContent)} disabled={!pasteContent.trim() || isProcessing} size="lg" className="px-10 bg-blue-600 hover:bg-blue-700 shadow-md">
                                                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                                        Process Data
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Tabs>
                                <div className="flex justify-start">
                                    <Button variant="ghost" onClick={() => setMode('entry')} className="text-slate-500 hover:text-blue-600"><ChevronLeft className="w-4 h-4 mr-2" /> Back to Single Entry</Button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Map */}
                        {step === 2 && (
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
                                        <div className="flex items-center gap-2 border-l border-blue-200 pl-6">
                                            <Label className="text-blue-700 text-xs uppercase font-bold tracking-widest">Default Account</Label>
                                            <Select value={defaultAccount} onValueChange={setDefaultAccount}>
                                                <SelectTrigger className="w-[200px] bg-white border-blue-200 hover:border-blue-400 transition-all font-medium text-blue-900 h-9"><SelectValue placeholder="Select Account..." /></SelectTrigger>
                                                <SelectContent>
                                                    {settings.accounts.map(acc => (
                                                        <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
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
                        )}

                        {/* Step 3: Verify */}
                        {step === 3 && (
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
                                                    {!Object.values(columnMapping).includes('account') && <th key="col-account" className="p-4 text-left font-bold text-slate-600 uppercase text-[10px] tracking-widest">Account</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.map((row, i) => (
                                                    <tr key={`row-${i}`} className="border-b last:border-0 border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                        {Object.entries(columnMapping).map(([idx, col]) => (
                                                            <td key={`${idx}-${col}`} className="p-4 font-medium text-slate-700">
                                                                {col === 'amount' ? (
                                                                    <span className={cn("font-bold", row[col] < 0 ? "text-red-500" : "text-emerald-500")}>
                                                                        {row[col] !== null ? row[col].toLocaleString('da-DK', { style: 'currency', currency: settings.currency || 'DKK' }) : 'Invalid'}
                                                                    </span>
                                                                ) : col === 'date' ? (
                                                                    <span className={cn(!row[col] && "text-red-500 font-bold")}>
                                                                        {row[col] ? format(new Date(row[col]), 'dd-MM-yyyy') : 'Invalid Date'}
                                                                    </span>
                                                                ) : row[col]}
                                                            </td>
                                                        ))}
                                                        {!Object.values(columnMapping).includes('account') && <td key="cell-account" className="p-4 text-slate-500 italic">{defaultAccount}</td>}
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
                        )}

                        {/* Step 4: Resolution */}
                        {step === 4 && (
                            <div className="animate-in slide-in-from-right-4 fade-in max-w-2xl mx-auto space-y-6 py-8 text-center">
                                <div className="mx-auto bg-amber-100 p-5 rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-inner">
                                    <AlertTriangle className="w-10 h-10 text-amber-600" />
                                </div>
                                <h3 className="text-3xl font-bold text-slate-800 tracking-tight">Unknown Accounts Found</h3>
                                <p className="text-slate-500 text-lg">Some accounts in your import don't exist in your settings. Please map them or create new ones.</p>

                                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl mt-10 text-left">
                                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-4">
                                        {unknownAccounts.map(acc => (
                                            <div key={acc} className="grid grid-cols-2 gap-6 items-center border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                                                <Badge variant="outline" className="text-sm font-bold py-2 px-4 bg-slate-50 border-slate-200 text-slate-700 justify-center h-10">{acc}</Badge>
                                                <Select value={accountResolutions[acc] || ''} onValueChange={(val) => setAccountResolutions(prev => ({ ...prev, [acc]: val }))}>
                                                    <SelectTrigger className={cn("h-10 border-slate-200", !accountResolutions[acc] && "border-amber-400 ring-2 ring-amber-100")}>
                                                        <SelectValue placeholder="Map to..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={acc} className="font-bold text-blue-600">+ Create New "{acc}"</SelectItem>
                                                        {settings.accounts.map(sa => (
                                                            <SelectItem key={sa} value={sa}>{sa}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between pt-10 px-2">
                                    <Button variant="ghost" size="lg" onClick={() => setStep(3)} className="text-slate-500">Back</Button>
                                    <Button onClick={handleResolutionSave} disabled={!unknownAccounts.every(acc => accountResolutions[acc]) || isProcessing} size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-12 font-bold shadow-lg shadow-amber-50">Complete Import</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 z-[100] bg-white/70 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in duration-300 rounded-3xl">
                        <div className="relative h-20 w-20 flex items-center justify-center">
                            <Loader2 className="h-16 w-16 text-blue-600 animate-spin absolute" />
                            <FileText className="h-6 w-6 text-blue-400 animate-pulse" />
                        </div>
                        <p className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent animate-pulse mt-4">Analyzing Data...</p>
                        <p className="text-slate-400 text-sm font-medium">This will only take a moment</p>
                    </div>
                )}

                {/* Floating errors removed in favor of inline ones above */}
            </DialogContent>
        </Dialog>
    );
};
