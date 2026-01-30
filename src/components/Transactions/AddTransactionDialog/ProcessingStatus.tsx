import { Loader2, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProcessingStatusProps {
    processingProgress: {
        current: number;
        total: number;
        stage: 'idle' | 'parsing' | 'processing' | 'validating' | 'saving' | 'complete' | 'error';
    };
    setIsProcessing: (isProcessing: boolean) => void;
}

export const ProcessingStatus = ({ processingProgress, setIsProcessing }: ProcessingStatusProps) => {
    return (
        <div className="absolute inset-0 z-[100] bg-white/70 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in duration-300 rounded-3xl">
            <div className="relative h-20 w-20 flex items-center justify-center">
                <Loader2 className="h-16 w-16 text-blue-600 animate-spin absolute" />
                <FileText className="h-6 w-6 text-blue-400 animate-pulse" />
            </div>

            <div className="text-center mt-4 space-y-2">
                <p className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
                    {processingProgress.stage === 'parsing' && 'Parsing Data...'}
                    {processingProgress.stage === 'processing' && `Processing Transactions: ${processingProgress.current}/${processingProgress.total}`}
                    {processingProgress.stage === 'validating' && 'Validating Data...'}
                    {processingProgress.stage === 'saving' && 'Saving Transactions...'}
                    {processingProgress.stage === 'complete' && 'Import Complete!'}
                    {processingProgress.stage === 'error' && 'Error Occurred'}
                </p>

                {processingProgress.total > 0 && (
                    <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                        />
                    </div>
                )}

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
    );
};
