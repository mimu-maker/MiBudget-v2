
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Zap, AlertCircle, Info } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';

export const NoiseFilterSettings = () => {
    const { settings, saveSettings } = useSettings();
    const [newFilter, setNewFilter] = useState('');

    const filters = settings.noiseFilters || [];

    const handleAdd = () => {
        if (!newFilter.trim()) return;
        if (filters.includes(newFilter.trim())) {
            setNewFilter('');
            return;
        }
        saveSettings({ noiseFilters: [...filters, newFilter.trim()] });
        setNewFilter('');
    };

    const handleRemove = (filter: string) => {
        saveSettings({ noiseFilters: filters.filter(f => f !== filter) });
    };

    const addDefaults = () => {
        const defaults = ['DK-NOTA', 'MobilePay:', 'SUMUP *', 'IZ *', 'SQUARE *', 'NETS', 'DANKORT-NOTA', 'BETALING', ' Dankort'];
        const unique = Array.from(new Set([...filters, ...defaults]));
        saveSettings({ noiseFilters: unique });
    };

    return (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                        System Noise Filters (Anti-Rules)
                    </CardTitle>
                    <CardDescription>
                        Common bank prefixes or "noise" to strip from transaction names before processing.
                    </CardDescription>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={addDefaults}
                    className="h-8 text-[10px] font-black uppercase tracking-tighter"
                >
                    Add Common Patterns
                </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            value={newFilter}
                            onChange={(e) => setNewFilter(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            placeholder="e.g. EBAY-NOTA-PAYMENT"
                            className="bg-white"
                        />
                    </div>
                    <Button onClick={handleAdd} className="bg-slate-900 hover:bg-black text-white px-6">
                        <Plus className="w-4 h-4 mr-2" /> Add
                    </Button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase font-black text-slate-400">Active Filters ({filters.length})</Label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {filters.map((filter, idx) => (
                            <Badge
                                key={idx}
                                variant="secondary"
                                className="bg-slate-100 hover:bg-rose-50 hover:text-rose-700 transition-colors py-1.5 px-3 rounded-md border border-slate-200 group flex items-center gap-2 cursor-pointer"
                                onClick={() => handleRemove(filter)}
                            >
                                <span className="font-mono text-xs">{filter}</span>
                                <Trash2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Badge>
                        ))}
                        {filters.length === 0 && (
                            <div className="w-full py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                <p className="text-sm text-slate-400 italic">No noise filters defined. Bank names will be processed as-is.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex gap-3">
                    <Info className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="text-xs text-amber-800 space-y-1">
                        <p className="font-bold">How it works</p>
                        <p>When you import transactions, the system will search for these patterns and remove them.
                            For example, "DK-NOTA 1234 SUNSET" becomes "SUNSET". This makes mapping much more reliable.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
