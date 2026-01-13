import { useState, useEffect, useCallback } from 'react';
import { processTransaction, MerchantRule } from '@/lib/importBrain';
import { parseDate, parseAmount } from '@/lib/importUtils';
import { useQuery } from '@tanstack/react-query';
import { useSettings } from '@/hooks/useSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Clipboard, AlertCircle, Archive, ArrowRight, CheckCircle2, AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MappingCard } from './MappingCard';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any[]) => void;
}

const transactionColumns = [
  'date', 'description', 'amount', 'account', 'status',
  'budget', 'category', 'subCategory', 'planned', 'recurring', 'note'
];

export const CsvImportDialog = ({ open, onOpenChange, onImport }: CsvImportDialogProps) => {
  const { settings, addItem } = useSettings();

  // Stages: 1=Upload, 2=Map, 3=Preview, 4=Resolution/Finish
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const [activeTab, setActiveTab] = useState('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [trustCsvCategories, setTrustCsvCategories] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Default Account Fallback (if no column mapped)
  const [defaultAccount, setDefaultAccount] = useState<string>('');

  // Account Resolution State
  const [unknownAccounts, setUnknownAccounts] = useState<string[]>([]);
  const [accountResolutions, setAccountResolutions] = useState<Record<string, string>>({});

  // Format Locale State
  const [locale, setLocale] = useState<'auto' | 'us' | 'eu'>('auto');

  // Fetch rules
  const { data: fetchedRules } = useQuery({
    queryKey: ['merchant_rules'],
    queryFn: async () => [],
    enabled: false
  });

  const [rules, setRules] = useState<any[]>([]);

  useEffect(() => {
    if (fetchedRules && fetchedRules.length > 0) {
      setRules(fetchedRules);
    }
  }, [fetchedRules]);

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
      }, 300);
    }
  }, [open]);

  const parseCSV = (text: string) => {
    setIsProcessing(true);
    // Small timeout to allow UI to render spinner if large file
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
          return row.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
        }).filter(row => row.length > 1 && row.some(cell => cell.length > 0));

        if (rows.length === 0) {
          setErrors(["No valid data found in file/paste"]);
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
          firstRow.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '');
            const match = transactionColumns.find(col =>
              col.toLowerCase().includes(normalizedHeader) ||
              normalizedHeader.includes(col.toLowerCase())
            );
            if (match) {
              autoMapping[index.toString()] = match;
            }
          });
          setColumnMapping(autoMapping);
        } else {
          setColumnMapping({});
        }

        setStep(2);

      } catch (e) {
        console.error("Parse error", e);
        setErrors(["Failed to parse CSV data. Please check the format."]);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPasteContent(e.target.value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (activeTab === 'history') setTrustCsvCategories(true);
    else setTrustCsvCategories(false);
    readFile(file);
  };

  const readFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.onerror = () => {
      setErrors(["Failed to read file"]);
      setIsProcessing(false);
    }
    reader.readAsText(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // Explicitly update trust settings based on tab
    if (activeTab === 'history') setTrustCsvCategories(true);
    else setTrustCsvCategories(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "text/csv" || file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      readFile(file);
    } else {
      setErrors(["Please upload a valid CSV or Text file."]);
    }
  }, [activeTab]);

  const generatePreview = () => {
    if (csvData.length === 0) return;
    setIsProcessing(true);
    setErrors([]);

    setTimeout(() => {
      try {
        const dataRows = hasHeaders ? csvData.slice(1) : csvData;
        const previewRows = dataRows.slice(0, 5);

        const previewData = previewRows.map((row, index) => {
          const transaction: any = { id: index.toString() };

          Object.entries(columnMapping).forEach(([csvIndex, transactionField]) => {
            const indexNum = parseInt(csvIndex);
            if (indexNum >= row.length) return;

            const value = row[indexNum];

            if (transactionField === 'amount') {
              transaction[transactionField] = parseAmount(value);
            } else if (transactionField === 'date') {
              transaction[transactionField] = parseDate(value);
            } else if (transactionField === 'planned') {
              const v = value.toLowerCase();
              transaction[transactionField] = v === 'true' || v === '1' || v === 'yes' || v === 'y';
            } else {
              transaction[transactionField] = value || '';
            }
          });

          // Apply Default Account if set
          if (!transaction.account && defaultAccount) {
            transaction.account = defaultAccount;
          }

          return transaction;
        });

        setPreview(previewData);

        const newErrors: string[] = [];
        const hasDescription = Object.values(columnMapping).includes('description');
        const hasAmount = Object.values(columnMapping).includes('amount');

        // Check if Account is either mapped OR a default is selected
        const hasAccountMapped = Object.values(columnMapping).includes('account');
        const hasDefaultAccount = !!defaultAccount;

        if (!hasDescription) newErrors.push("Missing REQUIRED column: 'description'");
        if (!hasAmount) newErrors.push("Missing REQUIRED column: 'amount'");
        if (!hasAccountMapped && !hasDefaultAccount) newErrors.push("Missing REQUIRED column: 'account' (or select a Default Account)");

        previewData.forEach((row, index) => {
          if (isNaN(row.amount)) newErrors.push(`Row ${index + 1}: Invalid amount`);
        });

        setErrors(newErrors);

        if (newErrors.length === 0) {
          setStep(3);
        }

      } catch (e) {
        console.error("Preview generation error", e);
        setErrors(["Error generating preview. Please check column mappings."]);
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

      // If we are using a DEFAULT ACCOUNT, we don't need to check for unknowns in the CSV data
      // because the user already selected a known system account.
      if (!accountColIndex) {
        if (defaultAccount) {
          // Double check default account exists? It should as it came from the list.
          executeImport();
        } else {
          setErrors(["No account column mapped and no default account selected."]);
          setIsProcessing(false);
        }
        return;
      }

      const foundAccounts = new Set<string>();
      dataRows.forEach(row => {
        if (row[parseInt(accountColIndex)]) {
          foundAccounts.add(row[parseInt(accountColIndex)]);
        }
      });

      const unknown = Array.from(foundAccounts).filter(acc => !settings.accounts.includes(acc));

      if (unknown.length > 0) {
        setUnknownAccounts(unknown);
        const initialResolutions: Record<string, string> = {};
        unknown.forEach(u => initialResolutions[u] = '');
        setAccountResolutions(initialResolutions);

        setStep(4);
        setIsProcessing(false);
      } else {
        executeImport();
      }
    }, 100);
  };

  const executeImport = async () => {
    setIsProcessing(true);
    // Timeout to render spinner
    setTimeout(async () => {
      try {
        const dataRows = hasHeaders ? csvData.slice(1) : csvData;

        const processedData = await Promise.all(dataRows.map(async (row, index) => {
          const transaction: any = { id: (Date.now() + index).toString() };

          Object.entries(columnMapping).forEach(([csvIndex, transactionField]) => {
            const indexNum = parseInt(csvIndex);
            if (indexNum >= row.length) return;

            const value = row[indexNum];
            if (transactionField === 'amount') {
              transaction[transactionField] = parseAmount(value);
            } else if (transactionField === 'date') {
              transaction[transactionField] = parseDate(value);
            } else if (transactionField === 'planned') {
              const v = value.toLowerCase();
              transaction[transactionField] = v === 'true' || v === '1' || v === 'yes' || v === 'y';
            } else if (transactionField === 'account') {
              const resolved = accountResolutions[value] || value;
              transaction[transactionField] = resolved;
            } else {
              transaction[transactionField] = value || '';
            }
          });

          // Fallback to default account if not mapped or empty value?
          // Note: If mapped, we used the value. If empty value in that column?
          if (!transaction.account && defaultAccount) {
            transaction.account = defaultAccount;
          }

          let processed = processTransaction(
            transaction.description || '',
            transaction.date, // Already parsed by parseDate to ISO
            rules as MerchantRule[]
          );

          if (trustCsvCategories && transaction.category) {
            processed = {
              ...processed,
              category: transaction.category,
              sub_category: transaction.subCategory || processed.sub_category,
              status: 'Complete'
            };
          }

          return { ...transaction, ...processed };
        }));

        onImport(processedData);
        onOpenChange(false);
      } catch (e) {
        console.error("Import error", e);
        setErrors(["Critical error during import processing."]);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handleResolutionSave = () => {
    const allResolved = unknownAccounts.every(acc => accountResolutions[acc]);
    if (!allResolved) return;

    Object.values(accountResolutions).forEach(targetAcc => {
      if (!settings.accounts.includes(targetAcc)) {
        addItem('accounts', targetAcc);
      }
    });

    executeImport();
  };

  const handleNavigateStep = (targetStep: number) => {
    if (isProcessing) return;
    if (targetStep === 1) setStep(targetStep);
    if (targetStep === 2 && csvData.length > 0) setStep(targetStep);
    if (targetStep === 3 && preview.length > 0) setStep(targetStep);
  }

  const stepsList = [
    { id: 1, label: 'Upload' },
    { id: 2, label: 'Map Columns' },
    { id: 3, label: 'Verify' },
    { id: 4, label: 'Finish' },
  ];

  // Calculate if Account is mapped to show/hide fallback selector
  const isAccountMapped = Object.values(columnMapping).includes('account');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto bg-slate-50 p-6">
        <DialogHeader className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-2xl font-semibold text-slate-800">Import Transactions</DialogTitle>
            <div className="text-sm text-slate-500">Step {step} of 4</div>
          </div>

          {/* Stepper Navigation */}
          <div className="relative flex items-center justify-between w-full px-4 mb-4">
            <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 -z-0 rounded-full" />
            <div
              className="absolute left-0 top-1/2 h-1 bg-blue-500 -z-0 rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />

            {stepsList.map((s) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              const isClickable = !isProcessing && (s.id < step || (s.id === 2 && csvData.length > 0) || (s.id === 3 && preview.length > 0));

              return (
                <div key={s.id}
                  className={cn("flex flex-col items-center gap-2 relative z-10", isClickable ? "cursor-pointer group" : "opacity-60 cursor-not-allowed")}
                  onClick={() => isClickable && handleNavigateStep(s.id)}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all shadow-sm",
                    isCompleted ? "bg-blue-600 border-blue-600 text-white" :
                      isCurrent ? "bg-white border-blue-600 text-blue-600 scale-110" :
                        "bg-white border-slate-300 text-slate-400 group-hover:border-slate-400"
                  )}>
                    {isCompleted ? <Check className="w-5 h-5" /> : s.id}
                  </div>
                  <span className={cn(
                    "text-xs font-medium whitespace-nowrap absolute -bottom-6 transition-colors",
                    isCurrent ? "text-blue-700 font-bold" : "text-slate-500"
                  )}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </DialogHeader>

        <div className="mt-8 min-h-[400px] relative">
          {/* Loading Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm animate-in fade-in transition-all">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-slate-600 animate-pulse">Processing...</p>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 1 && (
            <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab} className="w-full animate-in slide-in-from-right-4 fade-in">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-200 p-1 rounded-lg max-w-2xl mx-auto">
                <TabsTrigger value="upload" className="flex items-center gap-2"><Upload className="w-4 h-4" /> Upload File</TabsTrigger>
                <TabsTrigger value="paste" className="flex items-center gap-2"><Clipboard className="w-4 h-4" /> Paste Data</TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2"><Archive className="w-4 h-4" /> Historical</TabsTrigger>
              </TabsList>

              <div className="max-w-2xl mx-auto mt-8">
                <TabsContent value="upload">
                  <div
                    className={cn(
                      "bg-white border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:border-blue-400 group h-[300px]",
                      isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-300"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="bg-blue-50 p-4 rounded-full mb-4 group-hover:bg-blue-100 transition-colors">
                      <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-900 mb-2">Drag & drop your CSV file here</p>
                    <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload">
                      <Button variant="outline" size="lg" className="border-blue-200 hover:bg-blue-50 text-blue-700 pointer-events-none" asChild>
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </div>
                </TabsContent>

                <TabsContent value="paste">
                  <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 h-[300px] flex flex-col">
                    <Label>Paste Data</Label>
                    <Textarea
                      placeholder="Paste your CSV or Excel data here..."
                      className="flex-1 font-mono text-sm leading-relaxed"
                      value={pasteContent}
                      onChange={handlePasteChange}
                    />
                    <div className="flex justify-end">
                      <Button onClick={() => parseCSV(pasteContent)} disabled={!pasteContent.trim() || isProcessing} size="lg">
                        Process Data
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <div
                    className="bg-amber-50/50 border-2 border-dashed border-amber-300 rounded-xl p-16 flex flex-col items-center justify-center text-center h-[300px]"
                  >
                    <div className="bg-amber-100 p-4 rounded-full mb-4">
                      <Archive className="w-8 h-8 text-amber-600" />
                    </div>
                    <p className="text-lg font-medium text-amber-900 mb-2">Import Historical Data</p>
                    <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" id="history-upload" />
                    <label htmlFor="history-upload">
                      <Button className="bg-amber-600 hover:bg-amber-700 text-white border-0" size="lg" asChild>
                        <span>Browse Historical Files</span>
                      </Button>
                    </label>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}

          {/* Step 2: Map */}
          {step === 2 && (
            <div className="animate-in slide-in-from-right-4 fade-in space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Map Columns</h3>
                  <p className="text-sm text-blue-700">Matched <strong>{Object.keys(columnMapping).filter(k => k !== 'account_idx').length}</strong> fields.</p>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <label className="flex items-center space-x-2 cursor-pointer hover:text-blue-600">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={hasHeaders}
                      onChange={(e) => setHasHeaders(e.target.checked)}
                    />
                    <span className="font-medium text-slate-600">First row is header</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer hover:text-amber-600">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      checked={trustCsvCategories}
                      onChange={(e) => setTrustCsvCategories(e.target.checked)}
                    />
                    <span className="font-medium text-slate-600">Trust CSV Categories</span>
                  </label>

                  <div className="flex items-center gap-2 border-l pl-4 border-slate-300">
                    <Label className="text-slate-500 text-xs uppercase font-bold tracking-wider">Number Format</Label>
                    <Select value={locale} onValueChange={(v: any) => setLocale(v)}>
                      <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value="eu">EU (1.000,00)</SelectItem>
                        <SelectItem value="us">US (1,000.00)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* App-Field Centric Mapping UI */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Mandatory Fields */}
                <div className="md:col-span-2 lg:col-span-3">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 border-b pb-2 flex items-center gap-2">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">Required</span>
                    Essential Data
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['date', 'description', 'amount'].map(field => (
                      <MappingCard
                        key={field}
                        field={field}
                        mandatory={true}
                        columnMapping={columnMapping}
                        setColumnMapping={setColumnMapping}
                        csvHeaders={hasHeaders ? csvData[0] : csvData[0]?.map((_, i) => `Column ${i + 1}`)}
                        csvSample={csvData[hasHeaders ? 1 : 0]}
                      />
                    ))}
                    {/* Account Mapping (Special Case for Default) */}
                    <div className={cn("bg-white p-4 rounded-xl border-2 transition-all shadow-sm",
                      (Object.values(columnMapping).includes('account') || defaultAccount) ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50"
                    )}>
                      <div className="flex justify-between items-start mb-2">
                        <label className="text-sm font-semibold text-slate-700 capitalize flex items-center gap-1">
                          Account <span className="text-red-500">*</span>
                        </label>
                        {(Object.values(columnMapping).includes('account') || defaultAccount) && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-xs text-slate-500">Option 1: Map from CSV</span>
                          <Select
                            value={Object.entries(columnMapping).find(([_, f]) => f === 'account')?.[0] || ''}
                            onValueChange={(val) => {
                              setColumnMapping(prev => {
                                const m = { ...prev };
                                // Clear previous account mapping
                                Object.keys(m).forEach(k => { if (m[k] === 'account') delete m[k]; });
                                if (val && val !== 'skip') m[val] = 'account';
                                return m;
                              });
                              if (val && val !== 'skip') setDefaultAccount(''); // Clear default if mapped
                            }}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select Column..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">-- Unmapped --</SelectItem>
                              {csvData[0]?.map((_, idx) => (
                                <SelectItem key={idx} value={idx.toString()}>
                                  {hasHeaders ? csvData[0][idx] : `Column ${idx + 1}`}
                                  <span className="text-slate-400 ml-2 text-xs">({csvData[hasHeaders ? 1 : 0]?.[idx] || ''})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-300"></span></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-amber-50 px-2 text-slate-500">OR</span></div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-slate-500">Option 2: Use Default Account</span>
                          <Select
                            value={defaultAccount}
                            onValueChange={(val) => {
                              setDefaultAccount(val);
                              // Clear csv mapping if default selected
                              setColumnMapping(prev => {
                                const m = { ...prev };
                                Object.keys(m).forEach(k => { if (m[k] === 'account') delete m[k]; });
                                return m;
                              });
                            }}
                            disabled={Object.values(columnMapping).includes('account')}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select Default Account..." />
                            </SelectTrigger>
                            <SelectContent>
                              {settings.accounts.map(acc => <SelectItem key={acc} value={acc}>{acc}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional Fields */}
                <div className="md:col-span-2 lg:col-span-3 mt-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 border-b pb-2">Optional Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {transactionColumns.filter(c => !['date', 'description', 'amount', 'account'].includes(c)).map(field => (
                      <MappingCard
                        key={field}
                        field={field}
                        mandatory={false}
                        columnMapping={columnMapping}
                        setColumnMapping={setColumnMapping}
                        csvHeaders={hasHeaders ? csvData[0] : csvData[0]?.map((_, i) => `Column ${i + 1}`)}
                        csvSample={csvData[hasHeaders ? 1 : 0]}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={isProcessing}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setCsvData([]); setStep(1); }} disabled={isProcessing}>Cancel</Button>
                  <Button
                    onClick={generatePreview}
                    disabled={Object.keys(columnMapping).length === 0 || isProcessing}
                    className="px-8"
                  >
                    Next: Preview <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="animate-in slide-in-from-right-4 fade-in h-full flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Verify Data ({preview.length} rows)</h3>
                <div className="text-sm text-slate-500">Check the first 5 rows below.</div>
              </div>

              <div className="flex-1 border rounded-lg overflow-hidden bg-white shadow-sm mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        {transactionColumns.filter(c => Object.values(columnMapping).includes(c)).map(col => (
                          <th key={col} className="p-3 font-semibold text-slate-600 capitalize whitespace-nowrap">{col}</th>
                        ))}
                        {/* Show Account column if not mapped but default is used */}
                        {!Object.values(columnMapping).includes('account') && defaultAccount && (
                          <th className="p-3 font-semibold text-slate-600 capitalize whitespace-nowrap">Account</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-slate-50 transition-colors last:border-0">
                          {transactionColumns.filter(c => Object.values(columnMapping).includes(c)).map(col => (
                            <td key={col} className="p-3 border-r last:border-0 border-slate-50 max-w-[200px] truncate">
                              {col === 'amount' ? (
                                <span className={cn("font-medium", row[col] < 0 ? "text-red-600" : "text-emerald-600")}>
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'DKK' }).format(row[col])}
                                </span>
                              ) : col === 'planned' || col === 'recurring' ? (
                                row[col] ? <Badge variant="outline" className="bg-green-50 text-green-700">Yes</Badge> : <span className="text-slate-300">-</span>
                              ) : row[col]}
                            </td>
                          ))}
                          {!Object.values(columnMapping).includes('account') && defaultAccount && (
                            <td className="p-3 border-r last:border-0 border-slate-50 text-slate-600">
                              {defaultAccount} <span className="text-xs text-slate-400 ml-1">(Default)</span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between mt-auto pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={isProcessing}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back to Mapping
                </Button>
                <Button onClick={checkForUnknownAccounts} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 text-lg shadow-emerald-200 shadow-lg">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Confirm & Import
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Resolution */}
          {step === 4 && (
            <div className="animate-in slide-in-from-right-4 fade-in max-w-2xl mx-auto space-y-6 py-8">
              <div className="text-center space-y-2">
                <div className="mx-auto bg-amber-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Unknown Accounts Detected</h3>
                <p className="text-slate-500">Some accounts in your CSV don't match your settings.</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-2 gap-4 mb-4 font-medium text-sm text-slate-500 border-b pb-2">
                  <div>CSV Account Name</div>
                  <div>Map To System Account</div>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {unknownAccounts.map(acc => (
                    <div key={acc} className="grid grid-cols-2 gap-4 items-center group">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-base py-1 px-3 bg-slate-50">{acc}</Badge>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                      <Select
                        value={accountResolutions[acc] || ''}
                        onValueChange={(val) => setAccountResolutions(prev => ({ ...prev, [acc]: val }))}
                      >
                        <SelectTrigger className={cn("w-full transition-all", !accountResolutions[acc] && "border-amber-300 ring-2 ring-amber-100")}>
                          <SelectValue placeholder="Select Account..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={acc} className="font-medium text-blue-600 focus:text-blue-700 bg-blue-50">
                            + Create New "{acc}"
                          </SelectItem>
                          {settings.accounts.map(sa => (
                            <SelectItem key={sa} value={sa}>{sa}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(3)} disabled={isProcessing}>Back</Button>
                <Button
                  onClick={handleResolutionSave}
                  disabled={!unknownAccounts.every(acc => accountResolutions[acc]) || isProcessing}
                  className="bg-amber-600 hover:bg-amber-700 text-white min-w-[200px]"
                  size="lg"
                >
                  Complete Import
                </Button>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4">
              <Alert variant="destructive" className="animate-in slide-in-from-bottom-5 shadow-xl border-2 border-red-200 bg-white">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Error</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </AlertDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => setErrors([])}
                >
                  <span className="sr-only">Dismiss</span>
                  ×
                </Button>
              </Alert>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};
