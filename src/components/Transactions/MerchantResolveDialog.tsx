import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Transaction } from './hooks/useTransactionTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cleanMerchant } from '@/lib/importBrain';
import { MerchantRuleForm, MerchantRuleState } from '@/components/Settings/MerchantRuleForm';
import { Sparkles } from 'lucide-react';

interface MerchantResolveDialogProps {
    transaction: Transaction;
    children?: React.ReactNode;
    allTransactions?: Transaction[]; // For history preview
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    initialName?: string;
}

export const MerchantResolveDialog = ({
    transaction,
    children,
    allTransactions = [],
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    initialName
}: MerchantResolveDialogProps) => {
    const [internalOpen, setInternalOpen] = useState(false);

    // Controlled vs Uncontrolled logic
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Initialize rule state from transaction
    const baseName = initialName !== undefined ? initialName : (transaction.clean_merchant || cleanMerchant(transaction.merchant));

    const [initialRule, setInitialRule] = useState<MerchantRuleState>({
        raw_name: cleanMerchant(transaction.merchant),
        name: baseName,
        category: transaction.category !== 'Other' ? transaction.category : '',
        sub_category: transaction.sub_category || '',
        auto_recurring: transaction.recurring || 'N/A',
        auto_planned: true, // Auto-planned default (Unplanned OFF)
        auto_exclude: transaction.excluded || false,
        skip_triage: true
    });

    // Update rule if inputs change
    useEffect(() => {
        if (open) {
            setInitialRule({
                raw_name: cleanMerchant(transaction.merchant),
                name: initialName !== undefined ? initialName : (transaction.clean_merchant || cleanMerchant(transaction.merchant)),
                category: transaction.category !== 'Other' ? transaction.category : '',
                sub_category: transaction.sub_category || '',
                auto_recurring: transaction.recurring || 'N/A',
                auto_planned: true, // Auto-planned default (Unplanned OFF)
                auto_exclude: transaction.excluded || false,
                skip_triage: true
            });
        }
    }, [open, transaction.id, initialName]);

    const addRuleMutation = useMutation({
        mutationFn: async ({ rule, selectedIds }: { rule: MerchantRuleState, selectedIds: string[] }) => {
            // 1. Create the rule
            const payload: any = {
                user_id: user?.id,
                merchant_name: rule.raw_name,
                clean_merchant_name: rule.name,
                auto_category: rule.category,
                auto_sub_category: rule.sub_category,
                skip_triage: rule.skip_triage,
                auto_recurring: rule.auto_recurring,
                auto_planned: rule.auto_planned,
                auto_verify: true // Auto verify since user is creating it manually
            };

            if (rule.auto_exclude) {
                payload.auto_budget = 'Exclude';
            }

            const { error: ruleError } = await supabase.from('merchant_rules').insert([payload]);
            if (ruleError) throw ruleError;

            // 2. Apply to selected transactions
            if (selectedIds.length > 0) {
                const updates: any = {
                    clean_merchant: rule.name
                };

                if (rule.skip_triage) {
                    updates.category = rule.category;
                    updates.sub_category = rule.sub_category;
                    updates.recurring = rule.auto_recurring;
                    updates.planned = rule.auto_planned;
                    updates.excluded = rule.auto_exclude;
                    updates.status = 'Complete';
                }

                const { error: updateError } = await supabase
                    .from('transactions')
                    .update(updates)
                    .in('id', selectedIds);

                if (updateError) throw updateError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['merchant_rules'] });
            queryClient.invalidateQueries({ queryKey: ['merchant-rules-simple'] }); // Ensure Blue Pill updates immediately
            queryClient.invalidateQueries({ queryKey: ['existing-merchant-names'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setOpen(false);
        }
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {children && (
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-3xl bg-slate-50/50 p-1">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl text-blue-900">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        Resolve Merchant
                    </DialogTitle>
                    <DialogDescription>
                        Create a permanent rule for <strong>{transaction.merchant}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-2">
                    <MerchantRuleForm
                        initialRule={initialRule}
                        transactions={allTransactions} // Pass full list for history preview
                        onSave={(rule, selectedIds) => addRuleMutation.mutate({ rule, selectedIds })}
                        onCancel={() => setOpen(false)}
                        isSaving={addRuleMutation.isPending}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};
