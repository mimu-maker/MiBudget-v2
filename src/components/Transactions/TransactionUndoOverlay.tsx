
import React, { useEffect, useState } from 'react';
import { useTransactionUndo } from '@/contexts/TransactionUndoContext';
import { Button } from '@/components/ui/button';
import { RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TransactionUndoOverlay = () => {
    const { lastAction, undo, dismiss, isVisible, countdown } = useTransactionUndo();
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        setProgress((countdown / 5) * 100);
    }, [countdown]);

    if (!isVisible || !lastAction) return null;

    return (
        <div
            className={cn(
                "fixed bottom-8 right-8 z-[100] transition-all duration-500 ease-out transform pointer-events-none",
                isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
            )}
        >
            <div className="relative group pointer-events-auto">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                <div className="relative flex items-center gap-4 px-6 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-full overflow-hidden">
                    {/* Progress Bar (Subtle) */}
                    <div
                        className="absolute bottom-0 left-0 h-[2px] bg-blue-500/50 transition-all duration-1000 ease-linear"
                        style={{ width: `${progress}%` }}
                    />

                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {lastAction.description}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                            Revert in {countdown}s
                        </span>
                    </div>

                    <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4 ml-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={undo}
                            className="h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm transition-all active:scale-95 flex items-center gap-2"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="font-bold text-xs">UNDO</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={dismiss}
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
