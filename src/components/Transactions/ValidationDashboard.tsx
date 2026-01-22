import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Search, AlertCircle, HelpCircle, Save, ArrowRight, Zap, RefreshCw, Calendar, ExternalLink, MoreVertical, Info, Store } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ValidationDashboard = () => {
    const queryClient = useQueryClient();
    const { settings } = useSettings();
    const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
    const [selectedMerchantRule, setSelectedMerchantRule] = useState<{
        name: string;
        category: string;
        sub_category: string;
        auto_verify: boolean;
        transactionIds: string[];
    } | null>(null);

    // 1. Fetch all pending transactions
    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions', 'validation-pending'],
        queryFn: async () => {
            const { data } = await supabase
                .from('transactions')
                .select('*')
                .neq('budget', 'Exclude')
                .or('excluded.is.null,excluded.eq.false')
                .in('status', ['Unmatched', 'Verified'])
                .order('date', { ascending: false });
            return data || [];
        }
    });

    // 2. Fetch transactions without clean merchant names
    const { data: merchantsNeedingRules = [] } = useQuery({
        queryKey: ['transactions', 'no-clean-merchant'],
        queryFn: async () => {
            const { data } = await supabase
                .from('transactions')
                .select('*')
                .or('clean_merchant.is.null,clean_merchant.eq."",clean_merchant.eq." "')
                .neq('budget', 'Exclude')
                .or('excluded.is.null,excluded.eq.false')
                .order('date', { ascending: false });
            return data || [];
        }
    });

    // 2. Separate into the three requested buckets
    const confirmedItems = useMemo(() =>
        transactions.filter(tx => tx.status === 'Verified'),
        [transactions]);

    const triageReviewItems = useMemo(() =>
        transactions.filter(tx => tx.status === 'Unmatched' && (tx.confidence || 0) >= 0.8),
        [transactions]);

    const triageNoIdeaItems = useMemo(() =>
        transactions.filter(tx => tx.status === 'Unmatched' && (tx.confidence || 0) < 0.8),
        [transactions]);

    // Group "No Idea" items by merchant name
    const groupedNoIdea = useMemo(() => {
        const groups: Record<string, any[]> = {};
        triageNoIdeaItems.forEach(tx => {
            const name = tx.clean_merchant || tx.merchant;
            if (!groups[name]) groups[name] = [];
            groups[name].push(tx);
        });
        return groups;
    }, [triageNoIdeaItems]);

    // Group merchants needing rules by raw merchant name
    const groupedMerchantsNeedingRules = useMemo(() => {
        const groups: Record<string, any[]> = {};
        merchantsNeedingRules.forEach(tx => {
            const name = tx.merchant || 'Unknown Merchant';
            if (!groups[name]) groups[name] = [];
            groups[name].push(tx);
        });
        return groups;
    }, [merchantsNeedingRules]);

    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
            const { error } = await supabase
                .from('transactions')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions', 'no-clean-merchant'] });
        }
    });

    const bulkUpdateMutation = useMutation({
        mutationFn: async ({ ids, updates }: { ids: string[], updates: any }) => {
            const { error } = await supabase
                .from('transactions')
                .update(updates)
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions', 'no-clean-merchant'] });
        }
    });

    const createRuleMutation = useMutation({
        mutationFn: async ({ name, category, sub_category }: { name: string, category: string, sub_category: string | null }) => {
            const { error } = await supabase
                .from('merchant_rules')
                .insert([{
                    clean_merchant_name: name,
                    auto_category: category,
                    auto_sub_category: sub_category
                }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['merchant_rules'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions', 'no-clean-merchant'] });
            setRuleDialogOpen(false);
        }
    });

    const handleVerifySingle = (tx: any, category?: string, sub_category?: string | null) => {
        updateMutation.mutate({
            id: tx.id,
            updates: {
                status: 'Verified',
                category: category || tx.category,
                sub_category: sub_category || tx.sub_category,
            }
        });
    };

    const openRuleDialog = (merchantName: string, txs: any[]) => {
        setSelectedMerchantRule({
            name: merchantName,
            category: txs[0]?.category || '',
            sub_category: txs[0]?.sub_category || '',
            auto_verify: true,
            transactionIds: txs.map(t => t.id)
        });
        setRuleDialogOpen(true);
    };

    const handleSaveRule = () => {
        if (!selectedMerchantRule) return;

        // 1. Create the rule
        createRuleMutation.mutate({
            name: selectedMerchantRule.name,
            category: selectedMerchantRule.category,
            sub_category: selectedMerchantRule.sub_category
        });

        // 2. Apply to current transactions
        bulkUpdateMutation.mutate({
            ids: selectedMerchantRule.transactionIds,
            updates: {
                category: selectedMerchantRule.category,
                sub_category: selectedMerchantRule.sub_category,
                status: 'Verified'
            }
        });
    };

    const SearchLink = ({ name }: { name: string }) => {
        const query = encodeURIComponent(`Identify this merchant: ${name}`);
        const url = `https://www.google.com/search?q=${query}`;
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 p-1 px-2 rounded-md bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors text-[10px] font-bold uppercase tracking-wider"
            >
                <Search className="w-3 h-3" />
                Who is this?
            </a>
        );
    };

    const TransactionCard = ({ tx, type }: { tx: any, type: 'review' | 'unknown' | 'confirmed' }) => (
        <Card className={cn(
            "p-3 border-l-4 transition-all hover:shadow-md",
            type === 'confirmed' ? "border-l-emerald-500 bg-white opacity-80" :
                type === 'review' ? "border-l-blue-400 bg-blue-50/30" : "border-l-amber-400 bg-white"
        )}>
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-slate-800 truncate text-sm">{tx.clean_merchant || tx.merchant}</h3>
                        {tx.recurring && <RefreshCw className="w-3 h-3 text-blue-500" />}
                        {tx.planned && <Calendar className="w-3 h-3 text-indigo-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-500 font-medium">{tx.date} • {formatCurrency(tx.amount, settings.currency)}</p>
                        {tx.description && <span className="text-[10px] text-slate-400 italic truncate max-w-[150px]">• {tx.description}</span>}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {type === 'confirmed' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-500 hover:bg-emerald-50"
                            onClick={() => handleVerifySingle(tx)}
                        >
                            <Check className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {type === 'review' && tx.category && (
                <div className="mt-2 flex items-center justify-between">
                    <Badge variant="secondary" className="bg-white text-slate-700 text-[10px] h-5">
                        {tx.category} {tx.sub_category && `> ${tx.sub_category}`}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-blue-600 hover:bg-blue-50 gap-1 px-2"
                        onClick={() => openRuleDialog(tx.clean_merchant || tx.merchant, [tx])}
                    >
                        <Save className="w-3 h-3" /> Save Rule
                    </Button>
                </div>
            )}
        </Card>
    );

    return (
        <>
            <Tabs defaultValue="validation" className="h-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="validation">Validation</TabsTrigger>
                    <TabsTrigger value="merchants">Merchants</TabsTrigger>
                </TabsList>
                
                <TabsContent value="validation" className="h-full mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)] p-2">
                        {/* Left Column: Triage (Two Sections) */}
                        <div className="flex flex-col gap-6 h-full overflow-hidden">
                            {/* 1. Triage - Merchant Matches (Smart Matches) */}
                            <Card className="flex flex-col h-[40%] border-blue-200 shadow-sm overflow-hidden">
                                <CardHeader className="py-3 bg-blue-50/50 border-b">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                                                <Zap className="w-4 h-4 text-blue-500" />
                                                Smart Matches ({triageReviewItems.length})
                                            </CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {triageReviewItems.map(tx => <TransactionCard key={tx.id} tx={tx} type="review" />)}
                                    {triageReviewItems.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 italic py-8">
                                            <Check className="w-10 h-10 mb-2 opacity-10" />
                                            <p className="text-sm">No smart matches to review</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* 2. Unidentified Merchants */}
                            <Card className="flex flex-col h-[60%] border-amber-200 shadow-sm overflow-hidden">
                                <CardHeader className="py-3 bg-amber-50/50 border-b">
                                    <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                                        <HelpCircle className="w-4 h-4 text-amber-500" />
                                        Merchant Triage ({Object.keys(groupedNoIdea).length} groups)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
                                    {Object.entries(groupedNoIdea).map(([merchant, txs]) => (
                                        <div key={merchant} className="space-y-3 p-4 bg-white border rounded-xl shadow-sm border-slate-200 animate-in fade-in duration-300">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-black text-slate-900 leading-none">{merchant}</h4>
                                                        <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold border-slate-200 bg-slate-50">{txs.length} tx</Badge>
                                                    </div>
                                                    <SearchLink name={merchant} />
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-100"
                                                    onClick={() => openRuleDialog(merchant, txs)}
                                                >
                                                    <Save className="w-4 h-4" /> Save Rule
                                                </Button>
                                            </div>

                                            <div className="space-y-2 pt-2 border-t border-slate-50">
                                                {txs.map(tx => (
                                                    <div key={tx.id} className="flex items-center justify-between text-xs p-1 px-2 hover:bg-slate-50 rounded-md transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-400 font-mono">{tx.date}</span>
                                                            <span className="text-slate-700 font-medium truncate max-w-[120px]">{tx.description || 'No description'}</span>
                                                        </div>
                                                        <span className={cn("font-bold", tx.amount < 0 ? "text-slate-700" : "text-emerald-600")}>
                                                            {formatCurrency(tx.amount, settings.currency)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(groupedNoIdea).length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 italic py-8">
                                            <Zap className="w-10 h-10 mb-2 opacity-10" />
                                            <p className="text-sm">All merchants known!</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Confirmed Area */}
                        <Card className="flex flex-col h-full bg-slate-50/50 border-emerald-100 shadow-sm overflow-hidden">
                            <CardHeader className="py-4 bg-white border-b">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                                        <div className="bg-emerald-500 rounded-full p-1">
                                            <Check className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        Confirmed & Verified ({confirmedItems.length})
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                                {confirmedItems.map(tx => <TransactionCard key={tx.id} tx={tx} type="confirmed" />)}
                                {confirmedItems.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300 italic opacity-50">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                            <Check className="w-8 h-8" />
                                        </div>
                                        <p>Verification queue is empty</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="merchants" className="h-full mt-0">
                    <Card className="flex flex-col h-full border-red-200 shadow-sm overflow-hidden">
                        <CardHeader className="py-4 bg-red-50/50 border-b">
                            <CardTitle className="text-lg flex items-center gap-2 text-red-800">
                                <Store className="w-5 h-5 text-red-500" />
                                Merchants Needing Rules ({Object.keys(groupedMerchantsNeedingRules).length} groups)
                            </CardTitle>
                            <CardDescription>
                                These transactions have no clean merchant name and need merchant rules created.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
                            {Object.entries(groupedMerchantsNeedingRules).map(([merchant, txs]) => (
                                <div key={merchant} className="space-y-3 p-4 bg-white border rounded-xl shadow-sm border-slate-200 animate-in fade-in duration-300">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-black text-slate-900 leading-none">{merchant}</h4>
                                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold border-slate-200 bg-slate-50">{txs.length} tx</Badge>
                                            </div>
                                            <SearchLink name={merchant} />
                                        </div>
                                        <Button
                                            size="sm"
                                            className="h-8 bg-red-600 hover:bg-red-700 text-white font-bold gap-2 shadow-lg shadow-red-100"
                                            onClick={() => openRuleDialog(merchant, txs)}
                                        >
                                            <Save className="w-4 h-4" /> Create Rule
                                        </Button>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-50">
                                        {txs.map(tx => (
                                            <div key={tx.id} className="flex items-center justify-between text-xs p-1 px-2 hover:bg-slate-50 rounded-md transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 font-mono">{tx.date}</span>
                                                    <span className="text-slate-700 font-medium truncate max-w-[120px]">{tx.description || 'No description'}</span>
                                                </div>
                                                <span className={cn("font-bold", tx.amount < 0 ? "text-slate-700" : "text-emerald-600")}>
                                                    {formatCurrency(tx.amount, settings.currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(groupedMerchantsNeedingRules).length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 italic py-8">
                                    <Store className="w-10 h-10 mb-2 opacity-10" />
                                    <p className="text-sm">All merchants have clean names!</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Rule Configuration Dialog */}
            <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Merchant Rule</DialogTitle>
                        <DialogDescription>Apply auto-categorization for <span className="font-bold text-slate-900">{selectedMerchantRule?.name}</span></DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-slate-500">Category</Label>
                                <Select
                                    value={selectedMerchantRule?.category}
                                    onValueChange={(v) => setSelectedMerchantRule(p => p ? { ...p, category: v } : null)}
                                >
                                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {settings.categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-slate-500">Sub-category</Label>
                                <Input
                                    className="bg-white"
                                    placeholder="Optional"
                                    value={selectedMerchantRule?.sub_category}
                                    onChange={(e) => setSelectedMerchantRule(p => p ? { ...p, sub_category: e.target.value } : null)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="space-y-1">
                                <Label className="text-sm font-bold text-slate-700">Auto-verify</Label>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    {selectedMerchantRule?.auto_verify
                                        ? "Always confirm on import"
                                        : "Always Confirm (requires review)"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{selectedMerchantRule?.auto_verify ? 'ON' : 'OFF'}</span>
                                <Switch
                                    checked={selectedMerchantRule?.auto_verify}
                                    onCheckedChange={(v) => setSelectedMerchantRule(p => p ? { ...p, auto_verify: v } : null)}
                                />
                            </div>
                        </div>

                        <Alert className="bg-blue-50 border-blue-100">
                            <Info className="w-4 h-4 text-blue-600" />
                            <AlertDescription className="text-xs text-blue-700">
                                This rule will be applied to {selectedMerchantRule?.transactionIds.length} current matching transactions and all future imports.
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveRule} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8">Confirm & Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};


