import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { processTransaction, MerchantRule } from '@/lib/importBrain';
import { getCachedRules, saveRulesCache } from '@/lib/rulesCache';
import { parseDate, parseAmount, fuzzyMatchField, parseRecurringValue } from '@/lib/importUtils';
import { useQuery } from '@tanstack/react-query';
import { useSettings } from '@/hooks/useSettings';

export const transactionColumns = [
    'date', 'merchant', 'amount', 'status',
    'budget', 'category', 'sub_category', 'planned', 'recurring', 'description', 'budgetYear'
];

export const useTransactionImport = (onImport: (data: any[]) => void) => {
    const { settings, addItem } = useSettings();
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

    const [processingProgress, setProcessingProgress] = useState({
        current: 0,
        total: 0,
        stage: 'idle' as 'idle' | 'parsing' | 'processing' | 'validating' | 'saving' | 'complete' | 'error'
    });

    const cachedRules = getCachedRules();
    const { data: rulesData } = useQuery({
        queryKey: ['merchant_rules'],
        queryFn: async () => {
            const { data, error } = await supabase.from('merchant_rules').select('*');
            if (error) throw error;
            if (data && data.length > 0) saveRulesCache(data as MerchantRule[]);
            return data || [];
        },
        retry: 1
    });
    const rules = (rulesData && rulesData.length > 0) ? rulesData : cachedRules?.rules || [];

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
                    transactionColumns.some(col => cell.toLowerCase().includes(col.toLowerCase()))
                );
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
                                transaction[transactionField] = parseAmount(value);
                            } else if (transactionField === 'date') {
                                transaction[transactionField] = parseDate(value);
                            } else {
                                transaction[transactionField] = value || '';
                            }
                        }
                    });
                    if (!transaction.date) transaction.date = new Date().toISOString().split('T')[0];

                    const identificationString = (transaction.merchant || transaction.description || "").trim();
                    if (identificationString) {
                        const processed = processTransaction(identificationString, transaction.date, rules as MerchantRule[]);
                        transaction.suggested_category = processed.category || '';
                        transaction.suggested_category = processed.category || '';
                        transaction.suggested_sub_category = processed.sub_category || '';
                        transaction.confidence = processed.confidence;
                        transaction.budget_year = processed.budget_year;

                        if (!transaction.category || !trustCsvCategories) transaction.category = processed.category || transaction.category || 'Other';
                        if (!transaction.sub_category || !trustCsvCategories) transaction.sub_category = processed.sub_category || transaction.sub_category || '';
                    }
                    return transaction;
                });

                setPreview(previewData);
                if (!Object.values(columnMapping).includes('merchant')) newErrors.push("Missing 'merchant' mapping");
                if (!Object.values(columnMapping).includes('amount')) newErrors.push("Missing 'amount' mapping");

                setErrors(newErrors);
                if (newErrors.length === 0) setStep(3);
            } finally {
                setIsProcessing(false);
            }
        }, 100);
    };

    const checkForUnknownAccounts = () => {
        executeImport();
    };

    const executeImport = async () => {
        setIsProcessing(true);
        setErrors([]);
        setProcessingProgress({ current: 0, total: 0, stage: 'parsing' });

        const timeoutId = setTimeout(() => {
            setErrors(['Import timed out after 15 minutes.']);
            setProcessingProgress(prev => ({ ...prev, stage: 'error' }));
            setIsProcessing(false);
        }, 15 * 60 * 1000);

        setTimeout(async () => {
            try {
                const dataRows = hasHeaders ? csvData.slice(1) : csvData;
                if (dataRows.length === 0) throw new Error("No data rows found.");

                setProcessingProgress({ current: 0, total: dataRows.length, stage: 'processing' });

                const processedData: any[] = [];
                const batchSize = 50;

                for (let batchStart = 0; batchStart < dataRows.length; batchStart += batchSize) {
                    const batchEnd = Math.min(batchStart + batchSize, dataRows.length);
                    const batch = dataRows.slice(batchStart, batchEnd);

                    const batchProcessed = batch.map((row, index) => {
                        const actualIndex = batchStart + index;
                        const transaction: any = {
                            id: crypto.randomUUID(),
                            date: new Date().toISOString().split('T')[0],
                            merchant: '',
                            amount: 0,
                            status: 'Pending',
                            budget: 'Budgeted',
                            category: 'Other',
                            sub_category: '',
                            planned: false,
                            recurring: 'N/A',
                            description: ''
                        };

                        Object.entries(columnMapping).forEach(([csvIndex, transactionField]) => {
                            const indexNum = parseInt(csvIndex);
                            if (indexNum < row.length) {
                                const value = row[indexNum];
                                if (transactionField === 'amount') transaction[transactionField] = parseAmount(value) || 0;
                                else if (transactionField === 'date') transaction[transactionField] = parseDate(value) || transaction.date;
                                else if (transactionField === 'planned') transaction[transactionField] = ['yes', 'y', 'true', '1', 'on', 'checked', 'x'].includes(value?.toLowerCase().trim());
                                else if (transactionField === 'recurring') transaction[transactionField] = parseRecurringValue(value);
                                else transaction[transactionField] = value || '';
                            }
                        });

                        const identificationString = (transaction.merchant || transaction.description || "").trim();
                        let processed = processTransaction(identificationString, transaction.date, rules as MerchantRule[]);

                        transaction.budget_year = processed.budget_year;
                        if (!trustCsvCategories || !transaction.category) transaction.category = processed.category || transaction.category || 'Other';
                        if (!trustCsvCategories || !transaction.sub_category) transaction.sub_category = processed.sub_category || transaction.sub_category || '';

                        return transaction;
                    });

                    processedData.push(...batchProcessed);
                    setProcessingProgress(prev => ({ ...prev, current: batchEnd, stage: 'processing' }));
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                setProcessingProgress(prev => ({ ...prev, stage: 'validating' }));
                setProcessingProgress(prev => ({ ...prev, stage: 'saving' }));
                await onImport(processedData);
                setProcessingProgress(prev => ({ ...prev, stage: 'complete' }));
            } catch (err: any) {
                setErrors([`Execution error: ${err.message}`]);
                setProcessingProgress(prev => ({ ...prev, stage: 'error' }));
            } finally {
                clearTimeout(timeoutId);
                setIsProcessing(false);
            }
        }, 300);
    };

    const handleResolutionSave = async () => {
        executeImport();
    };

    return {
        step, setStep,
        isProcessing, setIsProcessing,
        csvData, hasHeaders, setHasHeaders,
        columnMapping, setColumnMapping,
        fieldConfigs, setFieldConfigs,
        errors, setErrors,
        preview, trustCsvCategories, setTrustCsvCategories,
        pasteContent, setPasteContent,
        processingProgress,
        parseCSV, readFile, generatePreview, checkForUnknownAccounts, executeImport, handleResolutionSave
    };
};
