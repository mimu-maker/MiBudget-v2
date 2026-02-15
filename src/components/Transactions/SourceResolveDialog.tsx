import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Transaction } from './hooks/useTransactionTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cleanSource } from '@/lib/importBrain';
import { SourceRuleForm, SourceRuleState } from '@/components/Settings/SourceRuleForm';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/useSettings';

interface SourceResolveDialogProps {
    transaction: Transaction;
    children?: React.ReactNode;
    allTransactions?: Transaction[]; // For history preview
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    initialName?: string;
    minimal?: boolean;
}

export const SourceResolveDialog = ({
    transaction,
    children,
    allTransactions = [],
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    initialName,
    minimal = false
}: SourceResolveDialogProps) => {
    const [internalOpen, setInternalOpen] = useState(false);

    // Controlled vs Uncontrolled logic
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { settings } = useSettings();
    const noiseFilters = settings.noiseFilters || [];

    // Initialize rule state from transaction
    const baseName = initialName !== undefined ? initialName : (transaction.clean_source || cleanSource(transaction.source, noiseFilters));

    const [initialRule, setInitialRule] = useState<SourceRuleState>({
        raw_name: transaction.source,
        name: baseName,
        category: transaction.category !== 'Other' ? transaction.category : '',
        sub_category: transaction.sub_category || '',
        auto_planned: true, // Auto-planned default (Unplanned OFF)
        auto_exclude: transaction.excluded || false,
        match_mode: 'fuzzy'
    });

    // Separate source-level settings
    const [sourceSettings, setSourceSettings] = useState({
        recurring: transaction.recurring || 'N/A',
        is_auto_complete: true // Default to auto-complete (skip triage) for resolved sources
    });

    useEffect(() => {
        if (open) {
            setInitialRule({
                raw_name: transaction.source,
                name: initialName !== undefined ? initialName : (transaction.clean_source || cleanSource(transaction.source, noiseFilters)),
                category: transaction.category !== 'Other' ? transaction.category : '',
                sub_category: transaction.sub_category || '',
                auto_planned: true, // Auto-planned default (Unplanned OFF)
                auto_exclude: transaction.excluded || false,
                match_mode: 'fuzzy'
            });
            setSourceSettings({
                recurring: transaction.recurring || 'N/A',
                is_auto_complete: true
            });
        }
    }, [open, transaction.id, initialName, noiseFilters]);

    const addRuleMutation = useMutation({
        mutationFn: async ({ rule, selectedIds, settings }: { rule: SourceRuleState, selectedIds: string[], settings: { recurring: string, is_auto_complete: boolean } }) => {
            // 1. Save Source Settings (Centralized)
            const { error: sourceError } = await supabase
                .from('sources')
                .upsert({
                    user_id: user?.id,
                    name: rule.name, // Use the clean name as the ID
                    recurring: settings.recurring,
                    is_auto_complete: settings.is_auto_complete
                }, { onConflict: 'user_id, name' });

            if (sourceError) throw sourceError;

            // 2. Create the rule
            // Unified internal rule representation
            const sourceRuleData = {
                user_id: user?.id,
                source_name: rule.raw_name,
                clean_source_name: rule.name,
                auto_category: rule.category,
                auto_sub_category: rule.sub_category,
                auto_planned: rule.auto_planned,
                match_mode: rule.match_mode || 'fuzzy',
                // Handle auto_budget correctly
                auto_budget: rule.auto_exclude ? 'Exclude' : 'Budgeted'
            };

            // Try source_rules first
            let { error: ruleError } = await (supabase as any)
                .from('source_rules')
                .upsert([sourceRuleData], { onConflict: 'user_id, source_name' });

            if (ruleError && (ruleError.code === '42P01' || ruleError.code === 'PGRST205' || ruleError.code === 'PGRST204' || ruleError.message?.includes('not found') || ruleError.message?.includes('column'))) {
                console.log("source_rules issues, falling back to merchant_rules");

                // Legacy schema mapping
                const fallbackPayload = {
                    user_id: user?.id,
                    merchant_name: rule.raw_name,
                    clean_merchant_name: rule.name,
                    auto_category: rule.category,
                    auto_sub_category: rule.sub_category,
                    auto_planned: rule.auto_planned,
                    match_mode: rule.match_mode || 'fuzzy',
                    auto_budget: rule.auto_exclude ? 'Exclude' : 'Budgeted'
                };

                const { error: fallbackError } = await (supabase as any)
                    .from('merchant_rules')
                    .upsert([fallbackPayload], { onConflict: 'user_id, merchant_name' });
                ruleError = fallbackError;
            }

            if (ruleError) throw ruleError;

            // 3. Apply to selected transactions
            if (selectedIds.length > 0) {
                const updates: any = {
                    // Always standardize names
                    clean_source: rule.name,
                    clean_merchant: rule.name,

                    // Apply recurring/planned settings even if not skipping triage
                    recurring: settings.recurring,
                    planned: rule.auto_planned,
                    excluded: rule.auto_exclude,
                    budget: rule.auto_exclude ? 'Exclude' : 'Budgeted'
                };

                // Apply categorization if we have it (even if partial)
                if (rule.category) {
                    updates.category = rule.category;
                    if (rule.sub_category) updates.sub_category = rule.sub_category;
                }

                if (settings.is_auto_complete) {
                    updates.status = 'Complete';
                }

                let { error: updateError } = await (supabase as any)
                    .from('transactions')
                    .update(updates)
                    .in('id', selectedIds);

                if (updateError && (updateError.code === '42703' || updateError.message?.includes('column') || updateError.message?.includes('does not exist'))) {
                    // Fallback for legacy schema
                    const { clean_source, source, budget, status, ...safeUpdates } = updates;
                    // Note: budget/status are standard, but clean_source is new. 
                    // actually updates constucted above has clean_source and clean_merchant.
                    // We just need to remove clean_source if it fails.
                    const { clean_source: _, ...legacyUpdates } = updates;

                    const { error: retryError } = await (supabase as any)
                        .from('transactions')
                        .update(legacyUpdates)
                        .in('id', selectedIds);
                    updateError = retryError;
                }

                if (updateError) throw updateError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sources'] }); // Invalidate sources too!
            queryClient.invalidateQueries({ queryKey: ['source_rules'] });
            queryClient.invalidateQueries({ queryKey: ['merchant_rules'] });
            queryClient.invalidateQueries({ queryKey: ['source-rules-simple'] });
            queryClient.invalidateQueries({ queryKey: ['existing-source-names'] });
            queryClient.invalidateQueries({ queryKey: ['existing-source-names-ranked'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });

            toast({
                title: "Rule Saved",
                description: `Successfully resolved ${transaction.source}.`,
            });

            setOpen(false);
        },
        onError: (error: any) => {
            console.error("Save Rule Error:", error);
            toast({
                title: "Error Saving Rule",
                description: error.message || "Something went wrong while saving the rule.",
                variant: "destructive"
            });
        }
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {children && (
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-3xl bg-white p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <div className="p-8 pb-0">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
                            Configure Source Rule
                        </DialogTitle>
                        <DialogDescription className="text-base text-slate-500 font-medium">
                            Create a rule to automate future transactions for this source.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-4 pt-2">
                    <SourceRuleForm
                        initialRule={initialRule}
                        transactions={allTransactions}
                        onSave={(rule, selectedIds) => addRuleMutation.mutate({ rule, selectedIds, settings: sourceSettings })}
                        onCancel={() => setOpen(false)}
                        isSaving={addRuleMutation.isPending}
                        showFullForm={!minimal}
                    />

                    {/* Source Settings Section */}
                    <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Recurring Status</Label>
                            <Select
                                value={sourceSettings.recurring}
                                onValueChange={(v) => setSourceSettings(prev => ({ ...prev, recurring: v }))}
                            >
                                <SelectTrigger className="w-full h-10">
                                    <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {['N/A', 'Monthly', 'Quarterly', 'Annually', 'Weekly', 'One-off'].map(r => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Auto-complete</Label>
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                <span className="text-sm font-medium text-slate-700">Skip Triage</span>
                                <Switch
                                    checked={sourceSettings.is_auto_complete}
                                    onCheckedChange={(v) => setSourceSettings(prev => ({ ...prev, is_auto_complete: v }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
