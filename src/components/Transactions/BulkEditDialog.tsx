
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Transaction } from './hooks/useTransactionTable';

interface BulkEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (updates: Partial<Transaction>) => void;
    selectedCount: number;
}

export const BulkEditDialog = ({
    open,
    onOpenChange,
    onApply,
    selectedCount,
}: BulkEditDialogProps) => {
    const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({
        status: false,
        budget: false,
        category: false,
        subCategory: false,
        planned: false,
        recurring: false,
        merchant: false,
        description: false,
    });

    const [values, setValues] = useState<Partial<Transaction>>({
        status: 'Complete',
        budget: 'Budgeted',
        category: '',
        subCategory: '',
        planned: false,
        recurring: false,
        merchant: '',
        description: '',
    });

    const handleToggleField = (field: string) => {
        setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleApply = () => {
        const updates: Partial<Transaction> = {};
        (Object.keys(enabledFields) as (keyof typeof enabledFields)[]).forEach(field => {
            if (enabledFields[field]) {
                (updates as any)[field] = values[field as keyof Transaction];
            }
        });
        onApply(updates);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Bulk Edit {selectedCount} Transactions</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="space-y-4">
                        {/* Merchant */}
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-merchant"
                                checked={enabledFields.merchant}
                                onCheckedChange={() => handleToggleField('merchant')}
                            />
                            <div className="grid flex-1 gap-1.5">
                                <Label htmlFor="merchant">Merchant</Label>
                                <Input
                                    id="merchant"
                                    disabled={!enabledFields.merchant}
                                    value={values.merchant}
                                    onChange={(e) => setValues({ ...values, merchant: e.target.value })}
                                    placeholder="e.g. Amazon"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-description"
                                checked={enabledFields.description}
                                onCheckedChange={() => handleToggleField('description')}
                            />
                            <div className="grid flex-1 gap-1.5">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    disabled={!enabledFields.description}
                                    value={values.description}
                                    onChange={(e) => setValues({ ...values, description: e.target.value })}
                                    placeholder="Details..."
                                />
                            </div>
                        </div>
                        {/* Status */}
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-status"
                                checked={enabledFields.status}
                                onCheckedChange={() => handleToggleField('status')}
                            />
                            <div className="grid flex-1 gap-1.5">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    disabled={!enabledFields.status}
                                    value={values.status}
                                    onValueChange={(v) => setValues({ ...values, status: v })}
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Complete">Complete</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="New">New</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Budget */}
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-budget"
                                checked={enabledFields.budget}
                                onCheckedChange={() => handleToggleField('budget')}
                            />
                            <div className="grid flex-1 gap-1.5">
                                <Label htmlFor="budget">Budget</Label>
                                <Select
                                    disabled={!enabledFields.budget}
                                    value={values.budget}
                                    onValueChange={(v) => setValues({ ...values, budget: v })}
                                >
                                    <SelectTrigger id="budget">
                                        <SelectValue placeholder="Select budget" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Budgeted">Budgeted</SelectItem>
                                        <SelectItem value="Special">Special</SelectItem>
                                        <SelectItem value="Exclude">Exclude</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Category */}
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-category"
                                checked={enabledFields.category}
                                onCheckedChange={() => handleToggleField('category')}
                            />
                            <div className="grid flex-1 gap-1.5">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    disabled={!enabledFields.category}
                                    value={values.category}
                                    onChange={(e) => setValues({ ...values, category: e.target.value })}
                                    placeholder="e.g. Food"
                                />
                            </div>
                        </div>

                        {/* Sub-category */}
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-subCategory"
                                checked={enabledFields.subCategory}
                                onCheckedChange={() => handleToggleField('subCategory')}
                            />
                            <div className="grid flex-1 gap-1.5">
                                <Label htmlFor="subCategory">Sub-category</Label>
                                <Input
                                    id="subCategory"
                                    disabled={!enabledFields.subCategory}
                                    value={values.subCategory}
                                    onChange={(e) => setValues({ ...values, subCategory: e.target.value })}
                                    placeholder="e.g. Groceries"
                                />
                            </div>
                        </div>

                        {/* Planned */}
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-planned"
                                checked={enabledFields.planned}
                                onCheckedChange={() => handleToggleField('planned')}
                            />
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="planned"
                                    disabled={!enabledFields.planned}
                                    checked={values.planned}
                                    onCheckedChange={(v) => setValues({ ...values, planned: !!v })}
                                />
                                <Label htmlFor="planned">Planned transaction</Label>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-recurring"
                                checked={enabledFields.recurring}
                                onCheckedChange={() => handleToggleField('recurring')}
                            />
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="recurring"
                                    disabled={!enabledFields.recurring}
                                    checked={values.recurring}
                                    onCheckedChange={(v) => setValues({ ...values, recurring: !!v })}
                                />
                                <Label htmlFor="recurring">Recurring transaction</Label>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleApply}>Apply to {selectedCount} items</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
