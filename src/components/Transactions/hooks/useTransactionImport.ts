import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { processTransaction, SourceRule } from '@/lib/importBrain';
import { getCachedRules, saveRulesCache } from '@/lib/sourceRulesCache';
import { parseDate, parseAmount, fuzzyMatchField, parseRecurringValue } from '@/lib/importUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCategories } from '@/hooks/useAnnualBudget';
import { useUnifiedCategoryActions } from '@/hooks/useBudgetCategories';
import { useSettings } from '@/hooks/useSettings';

// Map field names to common CSV header keywords (including localized Danish terms)
const COLUMN_ALIASES: Record<string, string[]> = {
    date: ['dato', 'booking', 'bogført', 'tidspunkt', 'transaktionsdato'],
    source: ['tekst', 'beskrivelse', 'modtager', 'afsender', 'source', 'merchant', 'vendor', 'butik', 'detaljer'],
    amount: ['beløb', 'sum', 'pris', 'value', 'dkk', 'currency', 'total'],
    category: ['kategori', 'type', 'gruppe', 'label'],
    sub_category: ['underkategori', 'sub', 'specifikation'],
    planned: ['planlagt', 'budgetteret', 'forventet'],
    recurring: ['fast', 'gentagelse', 'frekvens', 'periodisk'],
    notes: ['note', 'kommentar', 'ekstra', 'description', 'beskrivelse']
};

export const transactionColumns = Object.keys(COLUMN_ALIASES);

const generateFingerprint = (t: any) => {
    const account = t.account || 'Unknown';
    const str = `${t.date}-${t.source}-${t.amount}-${account}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
};

// Define types
export interface ProcessingProgress {
    stage: 'idle' | 'parsing' | 'processing' | 'validating' | 'saving' | 'complete' | 'error';
    current: number;
    total: number;
    dateSummary?: string;
}

export const useTransactionImport = (onImport: (data: any[], onProgress?: (current: number, total: number) => void) => void) => {
    const { settings } = useSettings();
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
    const [conflicts, setConflicts] = useState<any[]>([]);
    const [selectedConflictIds, setSelectedConflictIds] = useState<Set<string>>(new Set());

    const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
        stage: 'idle',
        current: 0,
        total: 0,
        dateSummary: '' as string
    });

    const [suggestions, setSuggestions] = useState<Record<string, { category: string, subCategory?: string, confidence: number }>>({});

    const [categoryValueMapping, setCategoryValueMapping] = useState<Record<string, string>>({});
    const [subCategoryValueMapping, setSubCategoryValueMapping] = useState<Record<string, string>>({});
    const [uniqueCsvCategories, setUniqueCsvCategories] = useState<string[]>([]);
    const [uniqueCsvSubCategories, setUniqueCsvSubCategories] = useState<Record<string, string[]>>({});

    const { categories: dbCategories, loading: loadingCategories } = useCategories();
    const { addCategory, addSubCategory } = useUnifiedCategoryActions();

    // Transform DB categories into simple structures for matching
    const systemCategories = useMemo(() =>
        dbCategories.map(c => c.name),
        [dbCategories]);

    const systemSubCategories = useMemo(() => {
        const map: Record<string, string[]> = {};
        dbCategories.forEach(c => {
            map[c.name] = c.sub_categories?.map((s: any) => s.name) || [];
        });
        return map;
    }, [dbCategories]);

    const queryClient = useQueryClient();
    const cachedRules = getCachedRules();
    const { data: sourceSettings = [] } = useQuery({
        queryKey: ['sources'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sources')
                .select('*');
            if (error) return [];
            return data || [];
        }
    });

    const { data: rulesData, isLoading: isLoadingRules } = useQuery({
        queryKey: ['source_rules_mapping'],
        queryFn: async () => {
            // Fetch both source_rules and source_rules (legacy: merchant_rules) in parallel
            // This ensures we get ALL rules regardless of migration status or RLS issues on one table
            const [sourceRes, merchantRes] = await Promise.allSettled([
                (supabase as any).from('source_rules').select('*'),
                (supabase as any).from('merchant_rules').select('*')
            ]);

            let rules: any[] = [];

            // 1. New Rules
            if (sourceRes.status === 'fulfilled' && sourceRes.value.data) {
                rules.push(...sourceRes.value.data);
            }

            // 2. Legacy Rules (mapped)
            if (merchantRes.status === 'fulfilled' && merchantRes.value.data) {
                const legacyRules = merchantRes.value.data.map((r: any) => ({
                    ...r,
                    // Map legacy to new schema for the processor
                    // Handle potential column variations
                    source_name: r.merchant || r.merchant_name,
                    clean_source_name: r.clean_merchant_name || r.name,
                    // Ensure keys match what processTransaction expects
                    id: r.id
                }));
                rules.push(...legacyRules);
            }

            return rules;
        },
        staleTime: 5 * 60 * 1000
    });

    const generateSuggestions = (csvCategory: string) => {
        const term = csvCategory.toLowerCase().trim();
        if (!term) return { category: '', subCategory: '', confidence: 0 };

        console.log(`[Mapping Debug] Term: "${term}"`, "DB Categories Length:", systemCategories.length);
        // console.log(`[Mapping Debug] Categories:`, systemCategories);

        // 1. Direct System Category Match (Highest Confidence)
        // Check if the CSV category exactly matches a system category
        const systemCatExact = systemCategories.find(c => c.toLowerCase() === term);
        if (systemCatExact) {
            console.log(`[Mapping Debug] Exact Cat Match: ${systemCatExact}`);
            return { category: systemCatExact, subCategory: '', confidence: 1.0 };
        }

        // Check if it's a known subcategory
        for (const [cat, subs] of Object.entries(systemSubCategories)) {
            const subMatch = subs.find(s => s.toLowerCase() === term);
            if (subMatch) {
                console.log(`[Mapping Debug] Exact Sub Match: ${cat} -> ${subMatch}`);
                return { category: cat, subCategory: subMatch, confidence: 1.0 };
            }
        }

        // 2. Fuzzy System Category Match
        // Check if a system category is contained in the CSV string (e.g. "Food expenses" -> "Food & Drinks")
        // Or if the CSV string is contained in a system category
        const systemCatFuzzy = systemCategories.find(c =>
            c.toLowerCase().includes(term) || term.includes(c.toLowerCase())
        );
        if (systemCatFuzzy) {
            console.log(`[Mapping Debug] Fuzzy Match: ${systemCatFuzzy}`);
            return { category: systemCatFuzzy, subCategory: '', confidence: 0.8 };
        }

        console.log(`[Mapping Debug] No Match for "${term}"`);
        return { category: '', subCategory: '', confidence: 0 };
    };
    const rules = (rulesData && rulesData.length > 0) ? rulesData : cachedRules?.rules || [];

    const reset = () => {
        setStep(1);
        setIsProcessing(false);
        setErrors([]);
        setPreview([]);
        setCsvData([]);
        setColumnMapping({});
        setPasteContent('');
        setProcessingProgress({ current: 0, total: 0, stage: 'idle', dateSummary: '' });
        setConflicts([]);
        setSelectedConflictIds(new Set());
    };

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
                const hasHeadersDetected = firstRow.some(cell => {
                    const c = cell.toLowerCase().trim();
                    return Object.values(COLUMN_ALIASES).flat().some(alias => c.includes(alias));
                });
                setHasHeaders(hasHeadersDetected);

                if (hasHeadersDetected) {
                    const autoMapping: Record<string, string> = {};
                    const usedFields = new Set<string>();
                    firstRow.forEach((header, index) => {
                        const h = header.toLowerCase().trim();
                        let match: string | null = null;

                        // 1. Try exact alias match first
                        for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
                            if (!usedFields.has(field) && aliases.some(a => h === a || h.includes(a))) {
                                match = field;
                                break;
                            }
                        }

                        // 2. Fallback to fuzzy match
                        if (!match) {
                            match = fuzzyMatchField(header, transactionColumns.filter(col => !usedFields.has(col)));
                        }

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
                const csvCats = new Set<string>();
                const csvSubCatsByCat: Record<string, Set<string>> = {};

                const previewData = dataRows.map((row, rowIndex) => {
                    const txId = `preview-${rowIndex}`;
                    const transaction: any = {
                        id: txId,
                        date: null,
                        source: '',
                        amount: 0,
                        status: 'Pending',
                        budget: 'Budgeted',
                        category: null,
                        sub_category: '',
                        planned: true, // Default to Planned (unplanned=N)
                        recurring: 'N/A',
                        notes: ''
                    };

                    let rawCsvCat = '';
                    let rawCsvSub = '';

                    Object.entries(columnMapping).forEach(([csvIndex, transactionField]) => {
                        const indexNum = parseInt(csvIndex);
                        if (indexNum < row.length) {
                            const value = row[indexNum] || '';
                            if (transactionField === 'amount') transaction[transactionField] = parseAmount(value) || 0;
                            else if (transactionField === 'date') {
                                const parsed = parseDate(value);
                                transaction[transactionField] = parsed;
                            }
                            else if (transactionField === 'planned') transaction[transactionField] = ['yes', 'y', 'true', '1', 'on', 'checked', 'x'].includes(value?.toLowerCase().trim());
                            else if (transactionField === 'recurring') transaction[transactionField] = parseRecurringValue(value);
                            else if (transactionField === 'category') {
                                rawCsvCat = value;
                                transaction[transactionField] = value;
                            }
                            else if (transactionField === 'sub_category') {
                                rawCsvSub = value;
                                transaction[transactionField] = value;
                            }
                            else transaction[transactionField] = value || '';
                        }
                    });

                    if (rawCsvCat) {
                        csvCats.add(rawCsvCat);

                        if (rawCsvSub) {
                            if (!csvSubCatsByCat[rawCsvCat]) csvSubCatsByCat[rawCsvCat] = new Set();
                            csvSubCatsByCat[rawCsvCat].add(rawCsvSub);
                        }
                    }

                    // Final fallback for date if still null: use today but mark for attention
                    if (!transaction.date) {
                        transaction.date = new Date().toISOString().split('T')[0];
                        transaction.needs_date_verification = true;
                    }

                    const identificationString = (transaction.source || transaction.notes || "").trim();
                    const processed = processTransaction(
                        identificationString,
                        transaction.date,
                        rules as SourceRule[],
                        settings.noiseFilters,
                        sourceSettings
                    );

                    transaction.clean_source = processed.clean_source;
                    transaction.confidence = processed.confidence;
                    transaction.budget_month = processed.budget_month;
                    transaction.budget_year = processed.budget_year;
                    transaction.status = processed.status === 'Complete' ? 'Complete' : 'Pending Triage';

                    // ONLY trust CSV categories if they actually exist, otherwise fallback to processed rules
                    if (!trustCsvCategories || !transaction.category) {
                        transaction.category = processed.category || transaction.category || null;
                    }
                    if (!trustCsvCategories || !transaction.sub_category) {
                        transaction.sub_category = processed.sub_category || transaction.sub_category || '';
                    }

                    return transaction;
                });

                setPreview(previewData);
                const newErrors: string[] = [];
                if (!Object.values(columnMapping).includes('source')) newErrors.push("Missing 'source' mapping");
                if (!Object.values(columnMapping).includes('amount')) newErrors.push("Missing 'amount' mapping");

                setErrors(newErrors);
                if (newErrors.length === 0) {
                    const uniqueCats = Array.from(csvCats).sort();
                    setUniqueCsvCategories(uniqueCats);

                    // Auto-populate mapping with high confidence suggestions
                    const initialMapping: Record<string, string> = {};
                    const initialSubMapping: Record<string, string> = {};
                    const newSuggestions: Record<string, { category: string, subCategory?: string, confidence: number }> = {};

                    uniqueCats.forEach(cat => {
                        const suggestion = generateSuggestions(cat);
                        if (suggestion.category) {
                            newSuggestions[cat] = { category: suggestion.category, confidence: suggestion.confidence };
                        }

                        // Auto-fill if confidence is high (inclusive of fuzzy matches at 0.8)
                        if (suggestion.confidence >= 0.7) {
                            initialMapping[cat] = suggestion.category;
                            if (suggestion.subCategory) {
                                initialSubMapping[cat] = suggestion.subCategory;
                            }
                        }
                    });
                    setSuggestions(newSuggestions);
                    setCategoryValueMapping(initialMapping);

                    const subCatsObj: Record<string, string[]> = {};
                    Object.entries(csvSubCatsByCat).forEach(([cat, subs]) => {
                        subCatsObj[cat] = Array.from(subs).sort();

                        // Try to map subcategories too
                        subs.forEach(sub => {
                            const subSuggestion = generateSuggestions(sub);
                            if (subSuggestion.subCategory) {
                                // Add to suggestions record for exact-match detection in UI
                                newSuggestions[sub] = {
                                    category: subSuggestion.category,
                                    subCategory: subSuggestion.subCategory,
                                    confidence: subSuggestion.confidence
                                };

                                if (subSuggestion.confidence >= 0.7) {
                                    initialSubMapping[sub] = subSuggestion.subCategory;
                                }
                            }
                        });
                    });
                    setSuggestions(newSuggestions); // Final update after processing both cats and subs
                    setSubCategoryValueMapping(initialSubMapping);
                    setUniqueCsvSubCategories(subCatsObj);

                    setStep(3); // Go to Value Mapping
                }
            } finally {
                setIsProcessing(false);
            }
        }, 100);
    };

    const applyValueMappings = () => {
        setPreview(prev => prev.map(tx => {
            let cat = tx.category;
            let sub = tx.sub_category;

            // Check if this row was promoted: Does the SUB-category have a direct mapping?
            // If so, that mapping overrides the parent category.
            if (sub && categoryValueMapping[sub]) {
                cat = categoryValueMapping[sub];
            } else if (cat && categoryValueMapping[cat]) {
                const mapped = categoryValueMapping[cat];
                if (mapped === '_BLANK_') {
                    cat = null;
                    sub = null; // If category is blanked, sub-category must also be blanked
                } else if (mapped !== '_KEEP_') {
                    cat = mapped;
                }
            }

            if (sub && subCategoryValueMapping[sub]) {
                const mapped = subCategoryValueMapping[sub];
                if (mapped === '_BLANK_') {
                    sub = null;
                } else if (mapped !== '_KEEP_') {
                    sub = mapped;

                    // If we mapped to a specific system subcategory, and we don't have a high-confidence parent yet
                    // or the sub-category is uniquely tied to a parent in our suggestions, use it.
                    // This fixes ")ss2) it's incorrectly aassociated with a sub-cat that doesn't exist under special"
                    const suggestion = suggestions[sub];
                    if (suggestion && suggestion.subCategory === mapped && suggestion.confidence >= 0.8) {
                        cat = suggestion.category;
                    }
                }
            }

            return { ...tx, category: cat, sub_category: sub };
        }));

        if (step === 3 && Object.keys(uniqueCsvSubCategories).length > 0) {
            setStep(4);
        } else {
            setStep(5); // Proceed to Preview
        }
    };

    const updatePreviewRow = (id: string, updates: any) => {
        setPreview(prev => prev.map(row => row.id === id ? { ...row, ...updates } : row));
    };

    const bulkUpdatePreview = (ids: string[], updates: any) => {
        setPreview(prev => prev.map(row => ids.includes(row.id) ? { ...row, ...updates } : row));
    };

    // Helper to apply a newly created rule to all preview rows locally
    const applyRuleToPreview = (rule: any) => {
        const rName = (rule.name || rule.clean_name || "").toLowerCase();
        if (!rName) return;

        setPreview(prev => prev.map(row => {
            const raw = (row.source || "").trim().toLowerCase();
            const target = (rule.name || "").trim().toLowerCase();

            // Only apply to EXACT raw matches in the preview to avoid broad swallowing
            if (raw === target && target !== "") {
                const isExcluded = rule.auto_exclude;
                const canComplete = rule.skip_triage && (isExcluded || (rule.category && rule.sub_category));

                return {
                    ...row,
                    clean_source: rule.clean_name,
                    category: rule.category,
                    sub_category: rule.sub_category,
                    status: canComplete ? 'Complete' : 'Pending Triage',
                    confidence: 1,
                    recurring: rule.auto_recurring || row.recurring,
                    planned: rule.auto_planned ?? row.planned,
                    excluded: isExcluded
                };
            }
            return row;
        }));
    };

    const checkForUnknownAccounts = async () => {
        setIsProcessing(true);
        setProcessingProgress(prev => ({ ...prev, stage: 'validating', current: 0, total: preview.length }));

        try {
            // 1. Generate fingerprints for all preview rows
            const previewWithFingerprints = preview.map(p => ({
                ...p,
                fingerprint: generateFingerprint(p)
            }));

            // 2. Fetch existing fingerprints from DB to check for duplicates
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData.user?.id || 'a316d106-5bc5-447a-b594-91dab8814c06';

            const previewFingerprints = previewWithFingerprints.map(p => p.fingerprint);

            // BATCH CHECKS to avoid "400 Request URI too long" (Supabase/PostgREST limit)
            const BATCH_SIZE = 100;
            const existingFingerprints = new Set<string>();

            for (let i = 0; i < previewFingerprints.length; i += BATCH_SIZE) {
                const batch = previewFingerprints.slice(i, i + BATCH_SIZE);
                const { data: existingBatch, error: batchError } = await supabase
                    .from('transactions')
                    .select('fingerprint')
                    .eq('user_id', userId)
                    .neq('excluded', true) // Ignore soft-deleted/excluded transactions
                    .in('fingerprint', batch);

                if (batchError) throw batchError;
                (existingBatch || []).forEach(e => existingFingerprints.add(e.fingerprint));
            }

            const duplicateTransactions = previewWithFingerprints.filter(p => existingFingerprints.has(p.fingerprint));

            if (duplicateTransactions.length > 0) {
                setConflicts(duplicateTransactions);
                setStep(6);
                setIsProcessing(false);
                return;
            }

            // No duplicates found, proceed to import
            executeImport();
        } catch (err: any) {
            setErrors([`Duplicate check failed: ${err.message}`]);
            setIsProcessing(false);
        }
    };

    const toggleConflictSelection = (id: string) => {
        setSelectedConflictIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllConflicts = (select: boolean) => {
        if (select) {
            setSelectedConflictIds(new Set(conflicts.map(c => c.id)));
        } else {
            setSelectedConflictIds(new Set());
        }
    };

    const executeImport = async () => {
        setIsProcessing(true);
        setErrors([]);

        // Identify which transactions to actually import
        // Non-conflicts + selected conflicts
        const conflictIds = new Set(conflicts.map(c => c.id));
        const nonConflicts = preview.filter(p => !conflictIds.has(p.id));
        const chosenConflicts = conflicts.filter(c => selectedConflictIds.has(c.id));
        const toImport = [...nonConflicts, ...chosenConflicts];

        if (toImport.length === 0) {
            setErrors(["No transactions selected for import."]);
            setIsProcessing(false);
            return;
        }

        setProcessingProgress({ current: 0, total: toImport.length, stage: 'saving', dateSummary: '' });

        const timeoutId = setTimeout(() => {
            setErrors(['Import timed out.']);
            setProcessingProgress(prev => ({ ...prev, stage: 'error' }));
            setIsProcessing(false);
        }, 5 * 60 * 1000);

        // Start processing immediately
        (async () => {
            try {
                // Use the filtered set
                if (toImport.length === 0) throw new Error("No data to import.");

                // 1. Sync categories and sub-categories before final import
                // Identify new ones that need to be created in the system
                const newCategories = new Set<string>();
                const newSubCategories: Record<string, Set<string>> = {};

                toImport.forEach(tx => {
                    if (tx.category && !systemCategories.includes(tx.category)) {
                        newCategories.add(tx.category);
                    }
                    if (tx.category && tx.sub_category) {
                        const existingSubs = systemSubCategories[tx.category] || [];
                        if (!existingSubs.includes(tx.sub_category)) {
                            if (!newSubCategories[tx.category]) newSubCategories[tx.category] = new Set();
                            newSubCategories[tx.category].add(tx.sub_category);
                        }
                    }
                });

                // Create missing categories
                for (const catName of newCategories) {
                    try {
                        await addCategory(catName);
                    } catch (e) {
                        console.error(`Failed to create category ${catName}:`, e);
                    }
                }

                // Create missing sub-categories
                for (const [catName, subs] of Object.entries(newSubCategories)) {
                    for (const subName of subs) {
                        try {
                            await addSubCategory(catName, subName);
                        } catch (e) {
                            console.error(`Failed to create sub-category ${subName}:`, e);
                        }
                    }
                }

                const finalData = toImport.map(row => ({
                    ...row,
                    id: crypto.randomUUID(),
                    // Ensure mandatory fields are present
                    category: row.category || null,
                    sub_category: row.sub_category || null,
                    fingerprint: generateFingerprint(row)
                }));

                const years = Array.from(new Set(finalData.map((t: any) => new Date(t.date).getFullYear()))).sort();
                const months = Array.from(new Set(finalData.map((t: any) => new Date(t.date).toLocaleString('default', { month: 'short' })))).sort();
                const dateSummary = `${years.join(', ')} (${months.join(', ')})`;

                await onImport(finalData, (current, total) => {
                    setProcessingProgress(prev => ({
                        ...prev,
                        current,
                        total,
                        stage: 'saving'
                    }));
                });
                setProcessingProgress({
                    current: finalData.length,
                    total: finalData.length,
                    stage: 'complete',
                    dateSummary
                });
            } catch (err: any) {
                setErrors([`Execution error: ${err.message}`]);
                setProcessingProgress(prev => ({ ...prev, stage: 'error' }));
                setIsProcessing(false);
            } finally {
                clearTimeout(timeoutId);
            }
        })();
    };

    const handleResolutionSave = async () => {
        executeImport();
    };

    const deletePreviewRow = (id: string) => {
        setPreview(prev => prev.filter(row => row.id !== id));
    };

    const bulkDeletePreviewRows = (ids: string[]) => {
        const idSet = new Set(ids);
        setPreview(prev => prev.filter(row => !idSet.has(row.id)));
    };

    const differentiatePreviewRow = (id: string) => {
        setPreview(prev => prev.map(row => {
            if (row.id === id) {
                const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
                return { ...row, date: `${row.date.split(' ')[0]} ${time}` };
            }
            return row;
        }));
    };

    return {
        step, setStep,
        isProcessing, setIsProcessing,
        csvData, hasHeaders, setHasHeaders,
        columnMapping, setColumnMapping,
        fieldConfigs, setFieldConfigs,
        errors, setErrors,
        preview, updatePreviewRow, bulkUpdatePreview, applyRuleToPreview, deletePreviewRow, bulkDeletePreviewRows, differentiatePreviewRow,
        trustCsvCategories, setTrustCsvCategories,
        pasteContent, setPasteContent,
        processingProgress,
        parseCSV,
        readFile,
        uniqueCsvCategories, setUniqueCsvCategories,
        uniqueCsvSubCategories, setUniqueCsvSubCategories,
        categoryValueMapping, setCategoryValueMapping,
        subCategoryValueMapping, setSubCategoryValueMapping,
        applyValueMappings,
        generatePreview,
        suggestions,
        checkForUnknownAccounts,
        handleResolutionSave,
        conflicts,
        selectedConflictIds,
        toggleConflictSelection,
        selectAllConflicts,
        executeImport,
        reset
    };
};
