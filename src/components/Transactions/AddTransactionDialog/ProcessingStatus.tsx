import { useState, useMemo, useEffect } from 'react';
import { Loader2, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProcessingStatusProps {
    processingProgress: {
        current: number;
        total: number;
        stage: 'idle' | 'parsing' | 'processing' | 'validating' | 'saving' | 'complete' | 'error';
        dateSummary?: string;
    };
    setIsProcessing: (isProcessing: boolean) => void;
    onClose?: () => void;
}

export const ProcessingStatus = ({ processingProgress, setIsProcessing, onClose }: ProcessingStatusProps) => {
    // Auto-close on complete
    useEffect(() => {
        if (processingProgress.stage === 'complete') {
            const timer = setTimeout(() => {
                setIsProcessing(false);
                if (onClose) onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [processingProgress.stage, setIsProcessing, onClose]);
    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full flex flex-col items-center animate-in zoom-in-95 duration-300">
                <div className="relative h-24 w-24 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20" />
                    <Loader2 className="h-16 w-16 text-blue-600 animate-spin absolute" />
                    <FileText className="h-8 w-8 text-blue-400" />
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
                                    Periods found: <span className="font-bold text-slate-700">{processingProgress.dateSummary}</span>
                                </p>
                                <p className="text-[10px] text-blue-500 font-medium">
                                    💡 Tip: Change your period filter to see these items
                                </p>
                                <p className="text-[10px] text-slate-400 pt-2">
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
        </div>
    );
};
