import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransactionImport } from './hooks/useTransactionImport';
import { ImportSourceStep } from './AddTransactionDialog/ImportSourceStep';
import { ImportMappingStep } from './AddTransactionDialog/ImportMappingStep';
import { ImportResolutionStep } from './AddTransactionDialog/ImportResolutionStep';
import { ProcessingStatus } from './AddTransactionDialog/ProcessingStatus';
import { Button } from '@/components/ui/button';

interface UnifiedAddTransactionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (transaction: any) => Promise<void>;
    onImport: (data: any[], onProgress?: (current: number, total: number) => void) => void;
}

export const UnifiedAddTransactionsDialog = ({ open, onOpenChange, onImport }: UnifiedAddTransactionsDialogProps) => {
    const navigate = useNavigate();

    const {
        step, setStep,
        isProcessing, setIsProcessing,
        csvData, hasHeaders, setHasHeaders,
        columnMapping, setColumnMapping,
        fieldConfigs, setFieldConfigs,
        errors, setErrors,
        preview,
        pasteContent, setPasteContent,
        processingProgress,
        unknownAccounts,
        accountResolutions, setAccountResolutions,
        parseCSV, readFile, generatePreview, handleResolutionSave, reset
    } = useTransactionImport(onImport);

    useEffect(() => {
        if (!open) {
            setTimeout(() => reset(), 300);
        }
    }, [open, reset]);

    const handleImportComplete = () => {
        onOpenChange(false);
        navigate('/transactions/validation');
    };

    // Total steps: 2 normally; 3 when account resolution is needed
    const totalSteps = step >= 3 ? 3 : 2;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                'bg-slate-50 transition-all duration-300',
                step === 2 ? 'w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto' : 'max-w-2xl'
            )}>
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-semibold">Import Transactions</DialogTitle>
                            <DialogDescription>
                                Import transactions from a CSV or Excel file and map the columns.
                            </DialogDescription>
                        </div>
                        <div className="text-sm text-slate-500">Step {step} of {totalSteps}</div>
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

                <div className="mt-4 min-h-[400px] relative">
                    {step === 1 && (
                        <ImportSourceStep
                            importSource="upload"
                            setImportSource={() => {}}
                            readFile={readFile}
                            parseCSV={parseCSV}
                            pasteContent={pasteContent}
                            setPasteContent={setPasteContent}
                            isProcessing={isProcessing}
                            setMode={() => {}}
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
                        <ImportResolutionStep
                            unknownAccounts={unknownAccounts}
                            accountResolutions={accountResolutions}
                            setAccountResolutions={setAccountResolutions}
                            preview={preview}
                            isProcessing={isProcessing}
                            setStep={setStep}
                            handleResolutionSave={handleResolutionSave}
                        />
                    )}
                </div>

                {isProcessing && (
                    <ProcessingStatus
                        processingProgress={processingProgress}
                        setIsProcessing={setIsProcessing}
                        onClose={handleImportComplete}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};
