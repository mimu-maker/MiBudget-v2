
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { getCachedRules, saveRulesCache } from '@/lib/rulesCache';
import { parseDate, parseAmount, fuzzyMatchField, parseRecurringValue } from '@/lib/importUtils';
import { useQuery } from '@tanstack/react-query';
import { APP_STATUSES, useSettings } from '@/hooks/useSettings';
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
        recurring: 'N/A', // Changed from boolean to string
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
    
    // Progress tracking for bulk import
    const [processingProgress, setProcessingProgress] = useState({
        current: 0,
        total: 0,
        stage: 'idle' as 'idle' | 'parsing' | 'processing' | 'validating' | 'saving' | 'complete' | 'error'
    });

    // Fetch rules
    const cachedRules = getCachedRules();
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
            if (data && data.length > 0) {
                saveRulesCache(data as MerchantRule[]);
            }
            return data || [];
        },
        retry: 1
    });
    const rules = (rulesData && rulesData.length > 0) ? rulesData : cachedRules?.rules || [];

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
                recurring: 'N/A', // Changed from boolean to string
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
                console.log('CSV headers detected:', firstRow);
                console.log('Transaction columns available:', transactionColumns);
                
                const hasHeadersDetected = firstRow.some(cell =>
                    transactionColumns.some(col =>
                        cell.toLowerCase().includes(col.toLowerCase())
                    )
                );
                
                console.log('Headers detected?', hasHeadersDetected);
                setHasHeaders(hasHeadersDetected);

                if (hasHeadersDetected) {
                    const autoMapping: Record<string, string> = {};
                    const usedFields = new Set<string>();
                    firstRow.forEach((header, index) => {
                        const match = fuzzyMatchField(header, transactionColumns.filter(col => !usedFields.has(col)));
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
                    if (!transaction.date) transaction.date = new Date().toISOString().split('T')[0];

                    // Apply auto-categorization for preview
                    const identificationString = (transaction.merchant || transaction.description || "").trim();
                    if (identificationString) {
                        const processed = processTransaction(identificationString, transaction.date, rules as MerchantRule[]);
                        const suggestedCategory = processed.category || '';
                        const suggestedSubCategory = processed.sub_category || '';

                        if (suggestedCategory) {
                            transaction[`suggested_category`] = suggestedCategory;
                        }
                        if (suggestedSubCategory) {
                            transaction[`suggested_subCategory`] = suggestedSubCategory;
                        }
                        transaction.confidence = processed.confidence;

                        const shouldApplyCategory = (!transaction.category || !trustCsvCategories) && suggestedCategory;
                        const shouldApplySubCategory = (!transaction.subCategory || !trustCsvCategories) && suggestedSubCategory;

                        if (shouldApplyCategory) {
                            transaction.category = suggestedCategory;
                        }
                        if (shouldApplySubCategory) {
                            transaction.subCategory = suggestedSubCategory;
                        }
                    }

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
        
        // Initialize progress tracking
        setProcessingProgress({
            current: 0,
            total: 0,
            stage: 'parsing'
        });

        // Add timeout protection - fail after 15 minutes for larger files
        const timeoutId = setTimeout(() => {
            setErrors(['Import timed out after 15 minutes. Please try again with a smaller file or check your network connection.']);
            setProcessingProgress(prev => ({
                ...prev,
                stage: 'error'
            }));
            setIsProcessing(false);
        }, 15 * 60 * 1000); // 15 minutes

        // Use a short delay to allow the processing animation to show
        setTimeout(async () => {
            try {
                const dataRows = hasHeaders ? csvData.slice(1) : csvData;
                if (dataRows.length === 0) {
                    throw new Error("No data rows found to import.");
                }
                
                // Update progress with total
                setProcessingProgress({
                    current: 0,
                    total: dataRows.length,
                    stage: 'processing'
                });

                // Ensure default accounts exist
                const defaultAccounts = ['Fixed', 'Credit Card', 'Master'];
                const availableAccounts = settings.accounts && settings.accounts.length > 0 ? settings.accounts : defaultAccounts;
                
                console.log('Available accounts for import:', availableAccounts);
                console.log('Default account:', defaultAccount || availableAccounts[0]);

                const importErrors: string[] = [];
                const merchantColIdx = Object.entries(columnMapping).find(([_, f]) => f === 'merchant')?.[0];

                // Process in smaller batches to avoid browser freezing
                const batchSize = 50;
                const processedData: any[] = [];
                
                for (let batchStart = 0; batchStart < dataRows.length; batchStart += batchSize) {
                    const batchEnd = Math.min(batchStart + batchSize, dataRows.length);
                    const batch = dataRows.slice(batchStart, batchEnd);
                    
                    const batchProcessed = await Promise.all(batch.map(async (row, index) => {
                        const actualIndex = batchStart + index;
                    // Update progress every 10 transactions
                    if (actualIndex % 10 === 0) {
                        setProcessingProgress(prev => ({
                            ...prev,
                            current: actualIndex + 1,
                            stage: 'processing'
                        }));
                    }
                    
                    // Ensure default accounts exist
                    const defaultAccounts = ['Fixed', 'Credit Card', 'Master'];
                    const availableAccounts = settings.accounts && settings.accounts.length > 0 ? settings.accounts : defaultAccounts;
                    
                    const transaction: any = {
                        id: crypto.randomUUID(), // Use robust UUIDs
                        date: new Date().toISOString().split('T')[0],
                        merchant: '',
                        amount: 0,
                        account: defaultAccount || availableAccounts[0] || 'Master',
                        status: 'Pending', // Default to Pending, not Complete
                        budget: 'Budgeted',
                        category: 'Other',
                        subCategory: '',
                        planned: false,
                        recurring: 'N/A', // Changed from boolean to string
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
                                console.log(`Parsing date: "${value}" -> "${parsed}"`);
                                if (parsed === null) {
                                    console.error(`Failed to parse date: "${value}"`);
                                    if (importErrors.length < 10) importErrors.push(`Row ${index + 1}: Invalid date format "${value}"`);
                                }
                                transaction[transactionField] = parsed || transaction.date;
                            } else if (transactionField === 'planned') {
                                // Handle boolean field for planned only
                                const truthyValues = ['yes', 'y', 'true', '1', 'on', 'checked', 'x'];
                                const falsyValues = ['no', 'n', 'false', '0', 'off', 'unchecked', ''];
                                const cleanValue = value?.toString().toLowerCase().trim();
                                
                                if (truthyValues.includes(cleanValue)) {
                                    transaction[transactionField] = true;
                                } else if (falsyValues.includes(cleanValue)) {
                                    transaction[transactionField] = false;
                                } else {
                                    // If it's not a clear boolean, try to parse as boolean
                                    transaction[transactionField] = Boolean(cleanValue) && cleanValue !== 'false';
                                }
                            } else if (transactionField === 'recurring') {
                                // Handle recurring as string field
                                transaction[transactionField] = parseRecurringValue(value);
                            } else {
                                transaction[transactionField] = value || '';
                            }
                        }
                    });

                    // Handle account mapping from resolutions or default
                    const rawAccount = transaction.account || "";
                    if (rawAccount && accountResolutions[rawAccount]) {
                        transaction.account = accountResolutions[rawAccount];
                    } else if (!rawAccount || !availableAccounts.includes(rawAccount)) {
                        transaction.account = defaultAccount || availableAccounts[0] || 'Master';
                    }

                    // Validate and map category/sub-category to dropdown choices
                    if (transaction.category && !settings.categories.includes(transaction.category)) {
                        console.warn(`Invalid category "${transaction.category}" - not in dropdown options`);
                        // Try fuzzy match to existing categories
                        const categoryMatch = fuzzyMatchField(transaction.category, settings.categories, 0.5);
                        if (categoryMatch) {
                            transaction.category = categoryMatch;
                            console.log(`Fuzzy matched category: "${transaction.category}" -> "${categoryMatch}"`);
                        } else {
                            transaction.category = 'Other'; // Fallback to default
                            console.log(`Category "${transaction.category}" not found, using "Other"`);
                        }
                    }
                    
                    if (transaction.subCategory && transaction.subCategory.trim()) {
                        // For sub-category, we don't have a predefined list, so keep as-is but clean it
                        transaction.subCategory = transaction.subCategory.trim();
                    }
                    
                    // Validate budget against available budget options
                    const budgetOptions = settings.budgetTypes || ['Budgeted', 'Special', 'Klintemarken', 'Exclude'];
                    if (transaction.budget && !budgetOptions.includes(transaction.budget)) {
                        const budgetMatch = fuzzyMatchField(transaction.budget, budgetOptions, 0.6);
                        if (budgetMatch) {
                            transaction.budget = budgetMatch;
                        } else {
                            transaction.budget = 'Budgeted'; // Fallback
                        }
                    }
                    
                    // Validate status against available status options
                    const statusOptions = ['Complete', 'Pending', 'New', 'Reconciled'];
                    if (transaction.status && !statusOptions.includes(transaction.status)) {
                        const statusMatch = fuzzyMatchField(transaction.status, statusOptions, 0.6);
                        if (statusMatch) {
                            transaction.status = statusMatch;
                        } else {
                            transaction.status = 'Pending'; // Fallback to Pending
                        }
                    }
                    
                    // CRITICAL: use 'merchant' field for processing rules, fallback to 'description'
                    const identificationString = (transaction.merchant || transaction.description || "").trim();
                    let processed = processTransaction(identificationString, transaction.date, rules as MerchantRule[]);

                    // Only override CSV values if trustCsvCategories is FALSE (meaning we want AI categorization)
                    // If CSV has valid categories and trustCsvCategories is true, keep them
                    if (!trustCsvCategories || !transaction.category) {
                        processed.category = processed.category || transaction.category || 'Other';
                    } else {
                        processed.category = transaction.category; // Keep CSV category
                    }
                    
                    // Map sub-category properly - processed uses sub_category, transaction uses subCategory
                    if (!trustCsvCategories || !transaction.subCategory) {
                        // Use AI processed sub_category if available, otherwise keep CSV value
                        transaction.subCategory = processed.sub_category || transaction.subCategory || '';
                    } else {
                        // Keep CSV sub-category, ignore AI processed one
                        transaction.subCategory = transaction.subCategory;
                    }
                    
                    // Remove the processed sub_category to avoid conflicts in the merge
                    const { sub_category, ...processedWithoutSubCategory } = processed;
                    
                    return { ...transaction, ...processedWithoutSubCategory };
                    }));
                    
                    processedData.push(...batchProcessed);
                    
                    // Update progress for this batch
                    setProcessingProgress(prev => ({
                        ...prev,
                        current: batchEnd,
                        stage: 'processing'
                    }));
                    
                    // Small delay to allow UI updates
                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                if (importErrors.length > 0) {
                    console.warn('Import warnings:', importErrors);
                    // Don't block import for warnings, just log them
                    setErrors([]); // Clear errors so import can proceed
                }

                if (processedData.length === 0) {
                    throw new Error("Processing failed: No transactions generated.");
                }

                // Update progress for validation
                setProcessingProgress(prev => ({
                    ...prev,
                    current: prev.total,
                    stage: 'validating'
                }));

                // Final safety check: try to call onImport and catch any internal errors
                try {
                    console.log(`Importing ${processedData.length} transactions...`);
                    
                    // Update progress for saving
                    setProcessingProgress(prev => ({
                        ...prev,
                        current: prev.total,
                        stage: 'saving'
                    }));
                    
                    await onImport(processedData);
                    console.log("Import successful!");
                    
                    // Mark as complete and show success screen
                    setProcessingProgress(prev => ({
                        ...prev,
                        stage: 'complete'
                    }));
                    
                    // Don't close immediately - show success screen
                    setTimeout(() => {
                        onOpenChange(false);
                    }, 3000); // Show success for 3 seconds
                } catch (importFnError: any) {
                    console.error("onImport failed:", importFnError);
                    setErrors([`Database error: ${importFnError.message || "Failed to save transactions"}`]);
                    
                    // Mark as error
                    setProcessingProgress(prev => ({
                        ...prev,
                        stage: 'error'
                    }));
                }

            } catch (err: any) {
                console.error("Import execution failed:", err);
                setErrors([`Execution error: ${err.message || "An unexpected error occurred during import"}`]);
                
                // Mark as error
                setProcessingProgress(prev => ({
                    ...prev,
                    stage: 'error'
                }));
            } finally {
                // Clear the timeout
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                setIsProcessing(false);
            }
        }, 300); // 300ms delay to ensure UI transition is smooth
    };

    const handleResolutionSave = async () => {
        console.log("Saving account resolutions:", accountResolutions);
        
        // Ensure default accounts exist
        const defaultAccounts = ['Fixed', 'CC', 'Master', 'Joint'];
        const availableAccounts = settings.accounts && settings.accounts.length > 0 ? settings.accounts : defaultAccounts;
        
        // Add all missing accounts
        const accountsToAdd: string[] = [];
        Object.values(accountResolutions).forEach(targetAcc => {
            if (!availableAccounts.includes(targetAcc)) {
                console.log(`Adding new account to settings: ${targetAcc}`);
                addItem('accounts', targetAcc);
                accountsToAdd.push(targetAcc);
            }
        });
        
        // Wait a moment for settings to update if we added accounts
        if (accountsToAdd.length > 0) {
            console.log('Waiting for settings to update...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        executeImport();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn("bg-slate-50 transition-all duration-300", mode === 'import' && step > 1 ? "w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto" : "max-w-2xl")}>
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-semibold">{mode === 'entry' ? 'Add New Transaction' : 'Import Transactions'}</DialogTitle>
                            <DialogDescription>
                                {mode === 'entry' 
                                    ? 'Add a new transaction manually with all required details.'
                                    : 'Import transactions from a CSV file and map the columns.'
                                }
                            </DialogDescription>
                        </div>
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
                                            <p className="text-[10px] text-slate-400 font-medium">Frequency?</p>
                                        </div>
                                        <Select value={formData.recurring} onValueChange={(v) => setFormData(p => ({ ...p, recurring: v }))}>
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Annually">Annually</SelectItem>
                                                <SelectItem value="Bi-annually">Bi-annually</SelectItem>
                                                <SelectItem value="Quarterly">Quarterly</SelectItem>
                                                <SelectItem value="Monthly">Monthly</SelectItem>
                                                <SelectItem value="Weekly">Weekly</SelectItem>
                                                <SelectItem value="One-off">One-off</SelectItem>
                                                <SelectItem value="N/A">N/A</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                                        {Object.entries(columnMapping).map(([idx, col]) => {
                                                            const isCategory = col === 'category' || col === 'subCategory';
                                                            const hasSuggestion = isCategory && row[`suggested_${col}`] && row[`suggested_${col}`] !== row[col];
                                                            
                                                            return (
                                                                <td key={`${idx}-${col}`} className="p-4 font-medium text-slate-700">
                                                                    {col === 'amount' ? (
                                                                        <span className={cn("font-bold", row[col] < 0 ? "text-red-500" : "text-emerald-500")}>
                                                                            {row[col] !== null ? row[col].toLocaleString('da-DK', { style: 'currency', currency: settings.currency || 'DKK' }) : 'Invalid'}
                                                                        </span>
                                                                    ) : col === 'date' ? (
                                                                        <span className={cn(!row[col] && "text-red-500 font-bold")}>
                                                                            {row[col] ? format(new Date(row[col]), 'dd-MM-yyyy') : 'Invalid Date'}
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
                        
                        {/* Progress Display */}
                        <div className="text-center mt-4 space-y-2">
                            <p className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
                                {processingProgress.stage === 'parsing' && 'Parsing Data...'}
                                {processingProgress.stage === 'processing' && `Processing Transactions: ${processingProgress.current}/${processingProgress.total}`}
                                {processingProgress.stage === 'validating' && 'Validating Data...'}
                                {processingProgress.stage === 'saving' && 'Saving Transactions...'}
                                {processingProgress.stage === 'complete' && 'Import Complete!'}
                                {processingProgress.stage === 'error' && 'Error Occurred'}
                            </p>
                            
                            {/* Progress Bar */}
                            {processingProgress.total > 0 && (
                                <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                                    />
                                </div>
                            )}
                            
                            {/* Additional Details */}
                            <div className="text-sm text-slate-600 space-y-1">
                                {processingProgress.stage === 'processing' && (
                                    <p>Processing {processingProgress.total} transactions...</p>
                                )}
                                {processingProgress.stage === 'complete' && (
                                    <div className="space-y-2">
                                        <p className="text-green-600 font-medium">
                                            ✅ Successfully imported {processingProgress.total} transactions!
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Dialog will close automatically in 3 seconds...
                                        </p>
                                    </div>
                                )}
                                {processingProgress.stage === 'error' && (
                                    <div className="space-y-2">
                                        <p className="text-red-600 font-medium">
                                            ❌ Import failed
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Check console for error details
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => setIsProcessing(false)}
                                            className="mt-2"
                                        >
                                            Close and Try Again
                                        </Button>
                                    </div>
                                )}
                                {processingProgress.stage !== 'complete' && processingProgress.stage !== 'error' && (
                                    <p className="text-slate-400">This will only take a moment</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating errors removed in favor of inline ones above */}
            </DialogContent>
        </Dialog>
    );
};
