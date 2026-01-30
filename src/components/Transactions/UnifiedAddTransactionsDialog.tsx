import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, FileText, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransactionImport } from './hooks/useTransactionImport';
import { ManualTransactionForm } from './AddTransactionDialog/ManualTransactionForm';
import { ImportSourceStep } from './AddTransactionDialog/ImportSourceStep';
import { ImportMappingStep } from './AddTransactionDialog/ImportMappingStep';
import { ImportPreviewStep } from './AddTransactionDialog/ImportPreviewStep';
import { ProcessingStatus } from './AddTransactionDialog/ProcessingStatus';

interface UnifiedAddTransactionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (transaction: any) => Promise<void>;
    onImport: (data: any[]) => void;
}

export const UnifiedAddTransactionsDialog = ({ open, onOpenChange, onAdd, onImport }: UnifiedAddTransactionsDialogProps) => {
    const [mode, setMode] = useState<'entry' | 'import'>('entry');
    const [importSource, setImportSource] = useState<'upload' | 'paste'>('upload');

    const {
        step, setStep,
        isProcessing, setIsProcessing,
        csvData, hasHeaders, setHasHeaders,
        columnMapping, setColumnMapping,
        fieldConfigs, setFieldConfigs,
        errors, setErrors,
        preview, trustCsvCategories,
        pasteContent, setPasteContent,
        processingProgress,
        parseCSV, readFile, generatePreview, checkForUnknownAccounts, handleResolutionSave
    } = useTransactionImport(onImport);

    // Reset state on open/close
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setStep(1);
                setErrors([]);
                setMode('entry');
            }, 300);
        }
    }, [open, setStep, setErrors]);

    const handleFormCancel = () => onOpenChange(false);

    // Wrap onAdd to close dialog on success
    const handleAdd = async (transaction: any) => {
        await onAdd(transaction);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn("bg-slate-50 transition-all duration-300",
                mode === 'import' && step > 1 ? "w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto" : "max-w-2xl")}>

                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-semibold">
                                {mode === 'entry' ? 'Add New Transaction' : 'Import Transactions'}
                            </DialogTitle>
                            <DialogDescription>
                                {mode === 'entry'
                                    ? 'Add a new transaction manually with all required details.'
                                    : 'Import transactions from a CSV file and map the columns.'
                                }
                            </DialogDescription>
                        </div>
                        {mode === 'import' && <div className="text-sm text-slate-500">Step {step} of 3</div>}
                    </div>

                    {errors.length > 0 && (
                        <Alert variant="destructive" className="mt-4 animate-in fade-in slide-in-from-top-2 border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="font-bold">Attention Needed</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                                <Button variant="link" size="sm" onClick={() => setErrors([])} className="p-0 h-auto mt-2 text-red-700 font-bold decoration-red-700">
                                    Clear errors and try again
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </DialogHeader>

                {mode === 'entry' ? (
                    <div className="space-y-6">
                        <Tabs defaultValue="form" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-200 p-1 rounded-lg">
                                <TabsTrigger value="form" className="flex items-center gap-2 font-medium tracking-tight">
                                    <Plus className="w-4 h-4" /> Single Transaction
                                </TabsTrigger>
                                <TabsTrigger value="bulk" onClick={() => setMode('import')} className="flex items-center gap-2 font-medium tracking-tight">
                                    <FileText className="w-4 h-4" /> Bulk Import
                                </TabsTrigger>
                            </TabsList>

                            <ManualTransactionForm
                                onAdd={handleAdd}
                                onCancel={handleFormCancel}
                                setIsProcessing={setIsProcessing}
                                setErrors={setErrors}
                            />
                        </Tabs>
                    </div>
                ) : (
                    <div className="mt-4 min-h-[400px] relative">
                        {step === 1 && (
                            <ImportSourceStep
                                importSource={importSource}
                                setImportSource={setImportSource}
                                readFile={readFile}
                                parseCSV={parseCSV}
                                pasteContent={pasteContent}
                                setPasteContent={setPasteContent}
                                isProcessing={isProcessing}
                                setMode={setMode}
                            />
                        )}

                        {step === 2 && (
                            <ImportMappingStep
                                csvData={csvData}
                                hasHeaders={hasHeaders}
                                setHasHeaders={setHasHeaders}
                                columnMapping={columnMapping}
                                setColumnMapping={setColumnMapping}
                                fieldConfigs={fieldConfigs}
                                setFieldConfigs={setFieldConfigs}
                                setStep={setStep}
                                generatePreview={generatePreview}
                            />
                        )}

                        {step === 3 && (
                            <ImportPreviewStep
                                preview={preview}
                                columnMapping={columnMapping}
                                setStep={setStep}
                                checkForUnknownAccounts={checkForUnknownAccounts}
                            />
                        )}
                    </div>
                )}

                {isProcessing && (
                    <ProcessingStatus
                        processingProgress={processingProgress}
                        setIsProcessing={setIsProcessing}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

// Internal Import for Button used in Alert (to avoid importing from UI in logic sections)
import { Button } from '@/components/ui/button';
