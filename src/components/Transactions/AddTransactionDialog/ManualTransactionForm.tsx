import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useCategorySource } from '@/hooks/useBudgetCategories';

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
        date: new Date().toISOString().split('T')[0],
        merchant: '',
        amount: '',
        status: 'Complete',
        budget: 'Budgeted',
        category: displayCategories[0] || 'Other',
        sub_category: '',
        planned: false,
        recurring: 'N/A',
        description: ''
    });

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsProcessing(true);
            await onAdd({
                ...formData,
                amount: parseFloat(formData.amount) || 0
            });
            // Reset form
            setFormData({
                date: new Date().toISOString().split('T')[0],
                merchant: '',
                amount: '',
                status: 'Complete',
                budget: 'Budgeted',
                category: displayCategories[0] || 'Other',
                sub_category: '',
                planned: false,
                recurring: 'N/A',
                description: ''
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
                    <Label htmlFor="date" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Date</Label>
                    <Input id="date" type="date" className="bg-white border-slate-200 focus:ring-blue-500" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="amount" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Amount (DKK)</Label>
                    <Input id="amount" type="number" step="0.01" className="bg-white border-slate-200 focus:ring-blue-500" value={formData.amount} onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="merchant" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Merchant</Label>
                <Input id="merchant" className="bg-white border-slate-200 focus:ring-blue-500 h-11 text-lg" placeholder="e.g. Amazon, Supermarket..." value={formData.merchant} onChange={(e) => setFormData(p => ({ ...p, merchant: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v, sub_category: '' }))}>
                        <SelectTrigger className="bg-white border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {displayCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Sub-category</Label>
                    <Select
                        value={formData.sub_category}
                        onValueChange={(v) => setFormData(p => ({ ...p, sub_category: v }))}
                        disabled={!formData.category}
                    >
                        <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder={formData.category ? "Select sub-category" : "Select a category first"} />
                        </SelectTrigger>
                        <SelectContent>
                            {(displaySubCategories[formData.category] || []).map(sub => (
                                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 py-2">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-slate-700">Unplanned</Label>
                        <p className="text-[10px] text-slate-400 font-medium">Is this a future expense?</p>
                    </div>
                    <Switch
                        checked={formData.planned}
                        onCheckedChange={(v) => setFormData(p => ({ ...p, planned: v }))}
                    />
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-slate-700">Recurring</Label>
                        <p className="text-[10px] text-slate-400 font-medium">Frequency?</p>
                    </div>
                    <Select value={formData.recurring} onValueChange={(v) => setFormData(p => ({ ...p, recurring: v }))}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Annually">Annually</SelectItem>
                            <SelectItem value="Bi-annually">Bi-annually</SelectItem>
                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="One-off">One-off</SelectItem>
                            <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Description (Optional)</Label>
                <Textarea
                    id="description"
                    className="bg-white border-slate-200 focus:ring-blue-500"
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
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
