import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';

interface ImportResolutionStepProps {
    unknownAccounts: string[];
    accountResolutions: Record<string, string>;
    setAccountResolutions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    isProcessing: boolean;
    setStep: (step: number) => void;
    handleResolutionSave: () => Promise<void>;
}

export const ImportResolutionStep = ({
    unknownAccounts,
    accountResolutions,
    setAccountResolutions,
    isProcessing,
    setStep,
    handleResolutionSave
}: ImportResolutionStepProps) => {
    const { settings } = useSettings();

    return (
        <div className="animate-in slide-in-from-right-4 fade-in max-w-2xl mx-auto space-y-6 py-8 text-center">
            <div className="mx-auto bg-amber-100 p-5 rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-inner">
                <AlertTriangle className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">Unknown Accounts Found</h3>
            <p className="text-slate-500 text-lg">Some accounts in your import don't exist in your settings. Please map them or create new ones.</p>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl mt-10 text-left">
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-4">
                    {unknownAccounts.map(acc => (
                        <div key={acc} className="grid grid-cols-2 gap-6 items-center border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                            <Badge variant="outline" className="text-sm font-bold py-2 px-4 bg-slate-50 border-slate-200 text-slate-700 justify-center h-10">{acc}</Badge>
                            <Select value={accountResolutions[acc] || ''} onValueChange={(val) => setAccountResolutions(prev => ({ ...prev, [acc]: val }))}>
                                <SelectTrigger className={cn("h-10 border-slate-200", !accountResolutions[acc] && "border-amber-400 ring-2 ring-amber-100")}>
                                    <SelectValue placeholder="Map to..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={acc} className="font-bold text-blue-600">+ Create New "{acc}"</SelectItem>
                                    {settings.accounts.map(sa => (
                                        <SelectItem key={sa} value={sa}>{sa}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-between pt-10 px-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(3)} className="text-slate-500">Back</Button>
                <Button onClick={handleResolutionSave} disabled={!unknownAccounts.every(acc => accountResolutions[acc]) || isProcessing} size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-12 font-bold shadow-lg shadow-amber-50">Complete Import</Button>
            </div>
        </div>
    );
};
