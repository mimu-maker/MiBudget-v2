
import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@/components/Transactions/hooks/useTransactionTable';
import { toast } from '@/hooks/use-toast';

const sanitizeTransaction = (tx: Transaction) => {
    // Remove fields that are not in the Supabase schema or are UI-only
    const { ...cleanTx } = tx as any;
    delete cleanTx.subCategory; // CamelCase version added in useTransactions
    return cleanTx;
};

export type UndoAction = {
    type: 'update' | 'bulk-update' | 'delete' | 'bulk-delete' | 'add' | 'split';
    transactions: Transaction[];
    description: string;
};

interface TransactionUndoState {
    lastAction: UndoAction | null;
    isVisible: boolean;
    countdown: number;
}

interface TransactionUndoActions {
    showUndo: (action: UndoAction) => void;
    undo: () => Promise<void>;
    dismiss: () => void;
}

const TransactionUndoStateContext = createContext<TransactionUndoState | undefined>(undefined);
const TransactionUndoActionsContext = createContext<TransactionUndoActions | undefined>(undefined);

export const TransactionUndoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lastAction, setLastAction] = useState<UndoAction | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const queryClient = useQueryClient();

    const dismiss = useCallback(() => {
        setIsVisible(false);
        setLastAction(null);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    }, []);

    const showUndo = useCallback((action: UndoAction) => {
        // Clear existing timers
        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        setLastAction(action);
        setIsVisible(true);
        setCountdown(5);

        // Start countdown
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Auto-dismiss after 5 seconds
        timerRef.current = setTimeout(() => {
            dismiss();
        }, 5000);
    }, [dismiss]);

    const undo = useCallback(async () => {
        if (!lastAction) return;

        const actionToUndo = { ...lastAction };
        dismiss();

        try {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user?.id;

            if (actionToUndo.type === 'update' || actionToUndo.type === 'bulk-update') {
                // Restore previous state for each transaction
                for (const tx of actionToUndo.transactions) {
                    const cleanTx = sanitizeTransaction(tx);
                    const { error } = await supabase
                        .from('transactions')
                        .update({
                            ...cleanTx,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', tx.id)
                        .eq('user_id', userId);

                    if (error) throw error;
                }
            } else if (actionToUndo.type === 'delete' || actionToUndo.type === 'bulk-delete') {
                // Re-insert deleted transactions
                const { error } = await supabase
                    .from('transactions')
                    .insert(actionToUndo.transactions.map(sanitizeTransaction));

                if (error) throw error;
            } else if (actionToUndo.type === 'add') {
                // Delete newly added transactions
                const ids = actionToUndo.transactions.map(t => t.id);
                const { error } = await supabase
                    .from('transactions')
                    .delete()
                    .in('id', ids)
                    .eq('user_id', userId);

                if (error) throw error;
            } else if (actionToUndo.type === 'split') {
                // Revert split: 1. Delete items, 2. Set is_split: false
                for (const tx of actionToUndo.transactions) {
                    await supabase
                        .from('transaction_items')
                        .delete()
                        .eq('transaction_id', tx.id);

                    const { error } = await supabase
                        .from('transactions')
                        .update({ is_split: false })
                        .eq('id', tx.id)
                        .eq('user_id', userId);

                    if (error) throw error;
                }
            }

            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast({
                title: "Action Undone",
                description: `Successfully reverted: ${actionToUndo.description}`,
                duration: 3000,
            });
        } catch (error: any) {
            console.error("Undo failed:", error);
            toast({
                title: "Undo Failed",
                description: error.message || "An error occurred while undoing.",
                variant: "destructive",
            });
        }
    }, [lastAction, dismiss, queryClient]);

    const stateValue = useMemo(() => ({ lastAction, isVisible, countdown }), [lastAction, isVisible, countdown]);
    const actionValue = useMemo(() => ({ showUndo, undo, dismiss }), [showUndo, undo, dismiss]);

    return (
        <TransactionUndoStateContext.Provider value={stateValue}>
            <TransactionUndoActionsContext.Provider value={actionValue}>
                {children}
            </TransactionUndoActionsContext.Provider>
        </TransactionUndoStateContext.Provider>
    );
};

export const useTransactionUndo = () => {
    const state = useContext(TransactionUndoStateContext);
    const actions = useContext(TransactionUndoActionsContext);
    if (!state || !actions) {
        throw new Error('useTransactionUndo must be used within a TransactionUndoProvider');
    }
    return { ...state, ...actions };
};

export const useTransactionUndoActions = () => {
    const actions = useContext(TransactionUndoActionsContext);
    if (!actions) {
        throw new Error('useTransactionUndoActions must be used within a TransactionUndoProvider');
    }
    return actions;
};
