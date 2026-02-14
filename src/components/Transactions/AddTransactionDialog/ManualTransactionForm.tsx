import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { SmartSelector } from '@/components/ui/smart-selector';
import { useSettings } from '@/hooks/useSettings';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { CategorySelector } from '@/components/Budget/CategorySelector';

interface ManualTransactionFormProps {
    onAdd: (transaction: any) => Promise<void>;
    onCancel: () => void;
    setIsProcessing: (loading: boolean) => void;
    setErrors: (errors: string[]) => void;
}

export const ManualTransactionForm = ({ onAdd, onCancel, setIsProcessing, setErrors }: ManualTransactionFormProps) => {
    const { settings } = useSettings();
    const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();

    const [formData, setFormData] = useState({
        date: format(new Date(), 'yy/MM/dd'),
        source: '',
        amount: '',
        status: 'Complete',
        budget: 'Budgeted',
        category: displayCategories[0] || '',
        sub_category: '',
        planned: true, // Default to Planned (unplanned=N)
        excluded: false,
        notes: ''
    });

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsProcessing(true);
            await onAdd({
                ...formData,
                amount: parseFloat(formData.amount) || 0,
                // Ensure date is in a format Supabase likes if necessary, 
                // but usually it accepts many formats. If it needs ISO:
                date: formData.date.includes('/') ? `20${formData.date.split('/')[0]}-${formData.date.split('/')[1]}-${formData.date.split('/')[2]}` : formData.date
            });
            // Reset form
            setFormData({
                date: format(new Date(), 'yy/MM/dd'),
                source: '',
                amount: '',
                status: 'Complete',
                budget: 'Budgeted',
                category: displayCategories[0] || '',
                sub_category: '',
                planned: true, // Default to Planned (unplanned=N)
                excluded: false,
                notes: ''
            });
        } catch (err: any) {
            setErrors([`Failed to add transaction: ${err.message}`]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleManualSubmit} className="space-y-5 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="date" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Date (YY/MM/DD)</Label>
                    <Input
                        id="date"
                        className="bg-white border-slate-200 focus:ring-blue-500 font-mono"
                        value={formData.date}
                        onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                        placeholder="25/07/13"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="amount" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Amount (DKK)</Label>
                    <Input id="amount" type="number" step="0.01" className="bg-white border-slate-200 focus:ring-blue-500" value={formData.amount} onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="source" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Source</Label>
                <Input id="source" className="bg-white border-slate-200 focus:ring-blue-500 h-11 text-lg" placeholder="e.g. Amazon, Supermarket..." value={formData.source} onChange={(e) => setFormData(p => ({ ...p, source: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Category</Label>
                    <CategorySelector
                        value={formData.category}
                        onValueChange={(v) => {
                            if (v.includes(':')) {
                                const [cat, sub] = v.split(':');
                                setFormData(p => ({ ...p, category: cat, sub_category: sub }));
                            } else {
                                setFormData(p => ({ ...p, category: v, sub_category: '' }));
                            }
                        }}
                        type="all"
                        suggestionLimit={3}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Sub-category</Label>
                    <SmartSelector
                        value={formData.sub_category}
                        onValueChange={(v) => setFormData(p => ({ ...p, sub_category: v }))}
                        disabled={!formData.category}
                        options={displaySubCategories[formData.category] || []}
                        placeholder={formData.category ? "Select sub-category" : "Select category first"}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-slate-700">Unplanned</Label>
                        <p className="text-[10px] text-slate-400 font-medium">Is this a future expense?</p>
                    </div>
                    <Switch
                        checked={!formData.planned}
                        onCheckedChange={(v) => setFormData(p => ({ ...p, planned: !v }))}
                    />
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-slate-700">Exclude</Label>
                        <p className="text-[10px] text-slate-400 font-medium">Hide from calculations</p>
                    </div>
                    <Switch
                        checked={formData.excluded}
                        onCheckedChange={(v) => setFormData(p => ({ ...p, excluded: v, status: v ? 'Excluded' : 'Complete' }))}
                        className="data-[state=checked]:bg-rose-500"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Notes (Optional)</Label>
                <Textarea
                    id="notes"
                    className="bg-white border-slate-200 focus:ring-blue-500"
                    value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Add any additional details or notes..."
                />
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-200 mt-6">
                <Button type="button" variant="ghost" onClick={onCancel} className="mr-3 text-slate-500 hover:text-slate-800">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 font-semibold shadow-lg shadow-blue-100">Add Transaction</Button>
            </div>
        </form>
    );
};
