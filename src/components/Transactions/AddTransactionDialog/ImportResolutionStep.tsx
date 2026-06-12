import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, CreditCard, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';

interface ImportResolutionStepProps {
    unknownAccounts: string[];
    accountResolutions: Record<string, string>;
    setAccountResolutions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    preview: any[];
    isProcessing: boolean;
    setStep: (step: number) => void;
    handleResolutionSave: () => Promise<void>;
}

export const ImportResolutionStep = ({
    unknownAccounts,
    accountResolutions,
    setAccountResolutions,
    preview,
    isProcessing,
    setStep,
    handleResolutionSave,
}: ImportResolutionStepProps) => {
    const { settings } = useSettings();
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const allNamed = unknownAccounts.every(acc => (accountResolutions[acc] ?? '').trim().length > 0);

    const txsForAccount = (acc: string) => preview.filter(tx => tx.account === acc);

    const toggleExpand = (acc: string) =>
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(acc) ? next.delete(acc) : next.add(acc);
            return next;
        });

    return (
        <div className="animate-in slide-in-from-right-4 fade-in space-y-6">
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm flex items-start gap-4">
                <div className="bg-amber-100 p-3 rounded-xl shrink-0">
                    <CreditCard className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-amber-900 tracking-tight">Name Your Accounts</h3>
                    <p className="text-sm text-amber-700 mt-1">
                        {unknownAccounts.length} account{unknownAccounts.length > 1 ? 's' : ''} in this import
                        {unknownAccounts.length > 1 ? ' aren\'t' : ' isn\'t'} in your settings yet.
                        Give {unknownAccounts.length > 1 ? 'each' : 'it'} a name — this is how
                        {unknownAccounts.length > 1 ? ' they\'ll' : ' it\'ll'} appear on your transactions.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {unknownAccounts.map(acc => {
                    const txs = txsForAccount(acc);
                    const isOpen = expanded.has(acc);
                    const name = accountResolutions[acc] ?? '';
                    const isNamed = name.trim().length > 0;

                    return (
                        <div
                            key={acc}
                            className={cn(
                                'bg-white rounded-2xl border shadow-sm transition-colors',
                                isNamed ? 'border-emerald-200' : 'border-amber-300'
                            )}
                        >
                            {/* Row: status icon + raw account + arrow + name input + expand toggle */}
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {isNamed
                                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                        : <div className="w-5 h-5 rounded-full border-2 border-amber-400 shrink-0" />
                                    }
                                    <Badge variant="outline" className="font-mono text-xs bg-slate-50 border-slate-200 text-slate-600 shrink-0 max-w-[180px] truncate">
                                        {acc}
                                    </Badge>
                                    <span className="text-slate-300 shrink-0">→</span>
                                    <Input
                                        placeholder="Account name…"
                                        value={name}
                                        onChange={e =>
                                            setAccountResolutions(prev => ({ ...prev, [acc]: e.target.value }))
                                        }
                                        className={cn(
                                            'h-9 flex-1',
                                            isNamed ? 'border-emerald-200' : 'border-amber-300 focus-visible:ring-amber-400'
                                        )}
                                    />
                                </div>

                                <button
                                    onClick={() => toggleExpand(acc)}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium whitespace-nowrap shrink-0"
                                >
                                    {isOpen
                                        ? <ChevronDown className="w-4 h-4" />
                                        : <ChevronRight className="w-4 h-4" />
                                    }
                                    {txs.length} transaction{txs.length !== 1 ? 's' : ''}
                                </button>
                            </div>

                            {/* Quick-pick chips for existing account names */}
                            {settings.accounts.length > 0 && !isNamed && (
                                <div className="px-4 pb-3 flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Existing:
                                    </span>
                                    {settings.accounts.map(sa => (
                                        <button
                                            key={sa}
                                            onClick={() =>
                                                setAccountResolutions(prev => ({ ...prev, [acc]: sa }))
                                            }
                                            className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full px-3 py-0.5 font-medium transition-colors"
                                        >
                                            {sa}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Collapsed transaction list */}
                            {isOpen && txs.length > 0 && (
                                <div className="mx-4 mb-4 border-t border-slate-100 pt-3">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <th className="text-left pb-2 pr-3">Date</th>
                                                <th className="text-left pb-2 pr-3">Merchant</th>
                                                <th className="text-right pb-2">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {txs.slice(0, 10).map(tx => (
                                                <tr key={tx.id} className="text-slate-600">
                                                    <td className="py-1.5 pr-3 font-mono text-slate-400">{tx.date}</td>
                                                    <td className="py-1.5 pr-3 max-w-[200px] truncate">
                                                        {tx.clean_source || tx.source || '—'}
                                                    </td>
                                                    <td className={cn(
                                                        'py-1.5 text-right font-mono font-semibold',
                                                        tx.amount < 0 ? 'text-red-500' : 'text-emerald-600'
                                                    )}>
                                                        {tx.amount?.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {txs.length > 10 && (
                                        <p className="text-[10px] text-slate-400 font-medium mt-2 text-center">
                                            +{txs.length - 10} more
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200">
                <Button variant="ghost" size="lg" onClick={() => setStep(2)} className="text-slate-500 hover:bg-slate-100">
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                    onClick={handleResolutionSave}
                    disabled={!allNamed || isProcessing}
                    size="lg"
                    className="px-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                    Save &amp; Import <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
};
