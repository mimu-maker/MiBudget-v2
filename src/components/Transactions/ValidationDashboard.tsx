import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Sparkles, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { categorizeWithAI } from '@/lib/aiCategorizer';

interface ValidationDashboardProps {
    apiKey?: string; // Optional API key for AI
}

export const ValidationDashboard = ({ apiKey }: ValidationDashboardProps) => {
    const queryClient = useQueryClient();
    const [loadingAI, setLoadingAI] = useState<string | null>(null);

    const { data: unmatchedTransactions = [] } = useQuery({
        queryKey: ['transactions', 'unmatched'],
        queryFn: async () => {
            const { data } = await supabase
                .from('transactions')
                .select('*')
                .eq('status', 'Unmatched')
                .order('date', { ascending: false });
            return data || [];
        }
    });

    const { data: verifiedTransactions = [] } = useQuery({
        queryKey: ['transactions', 'verified'],
        queryFn: async () => {
            const { data } = await supabase
                .from('transactions')
                .select('*')
                .eq('status', 'Verified')
                .order('updated_at', { ascending: false })
                .limit(10);
            return data || [];
        }
    });

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
        }
    });

    const handleVerify = (id: string, category: string, sub_category: string | null) => {
        updateMutation.mutate({
            id,
            updates: {
                status: 'Verified',
                category,
                sub_category
            }
        });
    };

    const handleAISuggestion = async (transaction: any) => {
        if (!apiKey) {
            alert("Please provide an AI API Key in settings to use this feature.");
            return;
        }
        setLoadingAI(transaction.id);
        const suggestion = await categorizeWithAI(transaction.clean_description || transaction.description, apiKey);
        setLoadingAI(null);

        if (suggestion) {
            updateMutation.mutate({
                id: transaction.id,
                updates: {
                    suggested_category: suggestion.category,
                    suggested_sub_category: suggestion.sub_category,
                    merchant_description: suggestion.merchant_description
                }
            });
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
            {/* Left Column: Triage */}
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
                        Triage ({unmatchedTransactions.length})
                    </CardTitle>
                    <CardDescription>Review and categorize unmatched transactions</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4">
                    {unmatchedTransactions.map((tx: any) => (
                        <Card key={tx.id} className="p-4 border-l-4 border-l-yellow-400">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold">{tx.clean_description || tx.description}</h3>
                                    <p className="text-sm text-gray-500">{tx.date} • {tx.amount} DKK</p>
                                </div>
                                <div className="flex space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleAISuggestion(tx)}
                                        disabled={loadingAI === tx.id}
                                    >
                                        <Sparkles className={`w-4 h-4 text-purple-500 ${loadingAI === tx.id ? 'animate-pulse' : ''}`} />
                                    </Button>
                                </div>
                            </div>

                            {/* AI Suggestion Area */}
                            {tx.suggested_category && (
                                <div className="bg-purple-50 p-2 rounded-md mb-3 text-sm border border-purple-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sparkles className="w-3 h-3 text-purple-600" />
                                        <span className="font-medium text-purple-900">AI Suggestion</span>
                                    </div>
                                    <p className="text-purple-800 mb-1">{tx.merchant_description}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <Badge variant="outline" className="bg-white text-purple-700 border-purple-200">
                                            {tx.suggested_category} {tx.suggested_sub_category ? `> ${tx.suggested_sub_category}` : ''}
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-7 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800"
                                            onClick={() => handleVerify(tx.id, tx.suggested_category!, tx.suggested_sub_category)}
                                        >
                                            Accept
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Manual Actions if no suggestion or override */}
                            {!tx.suggested_category && (
                                <div className="text-sm text-gray-500 italic">No AI suggestion yet. Click the sparkle icon.</div>
                            )}
                        </Card>
                    ))}
                    {unmatchedTransactions.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            All caught up! No unmatched transactions.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Right Column: Verified */}
            <Card className="flex flex-col h-full bg-gray-50/50">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Check className="w-5 h-5 mr-2 text-green-500" />
                        Recently Verified
                    </CardTitle>
                    <CardDescription>Quick sanity check of recent actions</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-2">
                    {verifiedTransactions.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm opacity-75 hover:opacity-100 transition-opacity">
                            <div>
                                <p className="font-medium text-sm">{tx.clean_description || tx.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        {tx.category}
                                    </Badge>
                                    <span className="text-xs text-gray-400">{tx.amount} DKK</span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400">{tx.status}</div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};
