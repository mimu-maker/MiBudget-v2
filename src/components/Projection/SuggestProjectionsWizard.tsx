import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { FutureTransaction, RecurringInterval } from '@/types/projection';
import { formatCurrency } from '@/lib/formatUtils';
import { Sparkles, Check, X, RefreshCw, Trash2, Edit2 } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useSources } from '@/hooks/useSources';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useAnnualBudget } from '@/hooks/useAnnualBudget';
import React, { useMemo } from 'react';

interface Suggestion {
    id: string;
    source: string;      // This will be the "Display Name" (clean)
    rawSource: string;   // This is the original "Input Name"
    amount: number;
    interval: RecurringInterval;
    count: number;
    category: string;
    subCategory: string;
    confidence: number;
    dates: string[];
    isAutoSuggested: boolean;
    saveAsRule: boolean;
}

interface SuggestProjectionsWizardProps {
    open: boolean;
    onClose: () => void;
    onAddProjections: (projections: FutureTransaction[]) => void;
}

const SuggestProjectionsWizard = ({ open, onClose, onAddProjections }: SuggestProjectionsWizardProps) => {
    const { settings } = useSettings();
    const { data: cleanSourcesData = [] } = useSources();
    const { budget } = useAnnualBudget(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ total: 0, scanned: 0 });
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchSuggestions = async () => {
        setLoading(true);
        setProgress(0);
        setSuggestions([]);
        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('merchant, clean_merchant, amount, date, category, sub_category')
                .order('date', { ascending: false });

            if (error) throw error;

            const groupsMap: Record<string, { source: string; rawSource: string; amount: number; dates: string[]; category: string; subCategory: string }> = {};

            transactions?.forEach(t => {
                const cleanName = (t as any).clean_merchant || '';
                const rawName = (t as any).merchant || '';
                const displayName = cleanName || rawName;

                const key = `${displayName}_${Math.round(t.amount)}`;
                if (!groupsMap[key]) {
                    groupsMap[key] = {
                        source: cleanName,
                        rawSource: rawName,
                        amount: Number(t.amount),
                        dates: [],
                        category: t.category || 'Food',
                        subCategory: t.sub_category || ''
                    };
                }
                groupsMap[key].dates.push(t.date);
            });

            const allGroups = Object.values(groupsMap);
            setStats({ total: allGroups.length, scanned: 0 });

            const CHUNK_SIZE = 10;
            let index = 0;

            const processChunk = () => {
                const start = index;
                const end = Math.min(index + CHUNK_SIZE, allGroups.length);
                const chunk = allGroups.slice(start, end);
                const chunkSuggestions: Suggestion[] = [];

                chunk.forEach(group => {
                    if (group.dates.length < 2) return;

                    const sortedDates = [...group.dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                    const intervals: number[] = [];
                    for (let i = 1; i < sortedDates.length; i++) {
                        const diff = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
                        intervals.push(diff);
                    }

                    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

                    let interval: RecurringInterval = 'N/A';
                    let confidence = 0;

                    if (avgInterval >= 25 && avgInterval <= 35) {
                        interval = 'Monthly';
                        confidence = 0.9;
                    } else if (avgInterval >= 80 && avgInterval <= 100) {
                        interval = 'Quarterly';
                        confidence = 0.8;
                    } else if (avgInterval >= 170 && avgInterval <= 195) {
                        interval = 'Bi-annually';
                        confidence = 0.85;
                    } else if (avgInterval >= 350 && avgInterval <= 380) {
                        interval = 'Annually';
                        confidence = 0.9;
                    }

                    if (interval !== 'N/A') {
                        chunkSuggestions.push({
                            id: Math.random().toString(36).substr(2, 9),
                            source: group.source,
                            rawSource: group.rawSource,
                            amount: group.amount,
                            interval,
                            count: group.dates.length,
                            category: group.category,
                            subCategory: group.subCategory,
                            confidence,
                            dates: sortedDates,
                            isAutoSuggested: true,
                            saveAsRule: true
                        });
                    }
                });

                if (chunkSuggestions.length > 0) {
                    setSuggestions(prev => [...prev, ...chunkSuggestions].sort((a, b) => b.confidence - a.confidence));
                }

                index = end;
                setProgress(Math.round((index / allGroups.length) * 100));
                setStats(prev => ({ ...prev, scanned: index }));

                if (index < allGroups.length) {
                    setTimeout(processChunk, 10);
                } else {
                    setLoading(false);
                }
            };

            processChunk();
        } catch (err) {
            console.error('Error fetching suggestions:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchSuggestions();
            setSelected(new Set());
            setEditingId(null);
        }
    }, [open]);

    const handleConfirm = async () => {
        const selectedSuggestions = suggestions.filter(s => selected.has(s.id));

        // 1. Add Projections
        const toAdd: FutureTransaction[] = selectedSuggestions.map(s => ({
            id: Date.now() + Math.random(),
            date: new Date().toISOString().slice(0, 10),
            source: s.source || s.rawSource,
            amount: s.amount,
            category: s.category,
            stream: s.subCategory || s.source || s.rawSource,
            planned: true,
            recurring: s.interval,
            budget_year: new Date().getFullYear(),
            description: `Auto-suggested (Raw: ${s.rawSource})`
        }));

        // 2. Save Rules if checked
        // 2. Save Rules and Source Settings if checked
        const rulesToSave = selectedSuggestions.filter(s => s.saveAsRule);
        if (rulesToSave.length > 0) {
            const { data: userData } = await supabase.auth.getUser();

            // 2a. Save Source Settings into 'sources' table (Centralized)
            const sourceSettingsPayload = rulesToSave.map(s => ({
                user_id: userData.user?.id,
                name: s.source || s.rawSource, // Use the clean name
                recurring: s.interval,
                is_auto_complete: false // FORCE DISABLE: Auto-complete system-wide disable
            }));

            const { error: settingsError } = await supabase
                .from('sources')
                .upsert(sourceSettingsPayload, { onConflict: 'user_id, name' });

            if (settingsError) {
                console.error("Error saving source settings:", settingsError);
                // Continue to save rules anyway, but log the error
            }

            // 2b. Save Rules into 'source_rules' table
            const payload = rulesToSave.map(s => ({
                source_name: s.rawSource,
                clean_source_name: s.source || s.rawSource,
                auto_category: s.category,
                auto_sub_category: s.subCategory,
                auto_planned: true,
                user_id: userData.user?.id
            }));

            await supabase.from('source_rules').insert(payload);
        }

        onAddProjections(toAdd);
        onClose();
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelected(newSelected);
    };

    const updateSuggestion = (id: string, updates: Partial<Suggestion>) => {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const rejectSuggestion = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSuggestions(prev => prev.filter(s => s.id !== id));
        const newSelected = new Set(selected);
        newSelected.delete(id);
        setSelected(newSelected);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <DialogTitle>Suggest Projections</DialogTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        We've analyzed history to suggest recurring transactions. Confirm, reject, or adjust them below.
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 px-1">
                    {loading && progress < 100 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <RefreshCw className="w-8 h-8 animate-spin mb-4 text-primary" />
                            <p className="font-medium animate-pulse">Analyzing history...</p>
                            <div className="w-full max-w-xs mt-6 space-y-2">
                                <Progress value={progress} className="h-2" />
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                    <span>{progress}% Complete</span>
                                    <span>{stats.scanned} / {stats.total} Groups</span>
                                </div>
                            </div>
                        </div>
                    ) : suggestions.length === 0 && !loading ? (
                        <div className="text-center py-12 text-muted-foreground">No suggestions found.</div>
                    ) : (
                        <div className="space-y-4">
                            {suggestions.map((s) => (
                                <div
                                    key={s.id}
                                    className={`relative p-4 border rounded-xl transition-all flex flex-col gap-3 ${selected.has(s.id) ? 'border-primary bg-primary/5 shadow-sm' : 'bg-card grayscale-[0.5] opacity-80'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-4 items-center flex-1">
                                            <div
                                                onClick={() => toggleSelection(s.id)}
                                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${selected.has(s.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 hover:border-primary'
                                                    }`}
                                            >
                                                {selected.has(s.id) && <Check className="w-4 h-4" />}
                                            </div>

                                            {editingId === s.id ? (
                                                <div className="flex flex-col gap-2 flex-1">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Display Name</label>
                                                            <Select
                                                                value={s.source}
                                                                onValueChange={(val) => updateSuggestion(s.id, { source: val })}
                                                            >
                                                                <SelectTrigger className="h-8 py-0">
                                                                    <SelectValue placeholder="Select name" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {cleanSourcesData.map(m => (
                                                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                                                    ))}
                                                                    <SelectItem value="__new__">+ New Name</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Amount</label>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={s.amount}
                                                                onChange={(e) => updateSuggestion(s.id, { amount: parseFloat(e.target.value) || 0 })}
                                                                className="h-8 py-0"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Category</label>
                                                            <Select
                                                                value={s.category}
                                                                onValueChange={(val) => updateSuggestion(s.id, { category: val, subCategory: '' })}
                                                            >
                                                                <SelectTrigger className="h-8 py-0">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {budget?.categories && budget.categories.filter((c: any) => c.budget_amount > 0).length > 0 ? (
                                                                        budget.categories
                                                                            .filter((c: any) => c.budget_amount > 0)
                                                                            .map(cat => <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>)
                                                                    ) : (
                                                                        <p className="p-2 text-xs text-slate-400 italic">No budgeted categories found</p>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Sub-category</label>
                                                            <Select
                                                                value={s.subCategory}
                                                                onValueChange={(val) => updateSuggestion(s.id, { subCategory: val })}
                                                                disabled={!s.category}
                                                            >
                                                                <SelectTrigger className="h-8 py-0">
                                                                    <SelectValue placeholder="Optional" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {budget?.categories && s.category && budget.categories.find((c: any) => c.name === s.category)?.sub_categories.filter((sc: any) => sc.budget_amount > 0).length > 0 ? (
                                                                        budget.categories
                                                                            .find((c: any) => c.name === s.category)
                                                                            ?.sub_categories.filter((sc: any) => sc.budget_amount > 0)
                                                                            .map(sub => <SelectItem key={sub.name} value={sub.name}>{sub.name}</SelectItem>)
                                                                    ) : (
                                                                        <p className="p-2 text-xs text-slate-400 italic">No budgeted sub-categories</p>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground italic">Input: {s.rawSource}</p>
                                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                                                        <Checkbox
                                                            id={`save-rule-${s.id}`}
                                                            checked={s.saveAsRule}
                                                            onCheckedChange={(val) => updateSuggestion(s.id, { saveAsRule: val === true })}
                                                        />
                                                        <Label htmlFor={`save-rule-${s.id}`} className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer">
                                                            Save as Source Rule (Auto-approve)
                                                        </Label>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-lg">
                                                        {s.source || s.rawSource}
                                                        {s.source && s.source !== s.rawSource && (
                                                            <span className="ml-2 text-xs font-normal text-muted-foreground">({s.rawSource})</span>
                                                        )}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold">{formatCurrency(s.amount)}</span>
                                                        <span className="text-xs text-muted-foreground">• {s.category} {s.subCategory && `> ${s.subCategory}`}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1">
                                                    {s.isAutoSuggested && (
                                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">
                                                            AUTO-SUGGESTED
                                                        </span>
                                                    )}
                                                    <Select
                                                        value={s.interval}
                                                        onValueChange={(val: RecurringInterval) => updateSuggestion(s.id, { interval: val, isAutoSuggested: false })}
                                                    >
                                                        <SelectTrigger className={`h-7 py-0 px-2 text-[11px] font-bold ${s.isAutoSuggested ? 'border-amber-300 ring-amber-300' : ''}`}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {['Monthly', 'Quarterly', 'Bi-annually', 'Annually'].map(opt => (
                                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground mt-1 text-right">Found {s.count} times in history</span>
                                            </div>

                                            <div className="flex flex-col gap-1 ml-4 border-l pl-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                                                >
                                                    {editingId === s.id ? <Check className="w-4 h-4 text-green-600" /> : <Edit2 className="w-4 h-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={(e) => rejectSuggestion(s.id, e)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <div className="flex-1" />
                    <Button
                        onClick={handleConfirm}
                        disabled={selected.size === 0}
                        className="gap-2 min-w-[150px]"
                    >
                        Confirm {selected.size} Projection{selected.size !== 1 ? 's' : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SuggestProjectionsWizard;
