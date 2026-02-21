
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Transaction } from './hooks/useTransactionTable';
import { useSettings } from '@/hooks/useSettings';
import { useCategorySource, useUnifiedCategoryActions } from '@/hooks/useBudgetCategories';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { SmartSelector } from '@/components/ui/smart-selector';

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
    const { settings } = useSettings();
    const { addCategory, addSubCategory } = useUnifiedCategoryActions();
    const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();
    const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({
        status: false,
        budget: false,
        category: false,
        sub_category: false,
        unplanned: false,
        source: false,
        notes: false,
    });

    const [values, setValues] = useState<Partial<Transaction>>({
        status: 'Complete',
        budget: 'Budgeted',
        category: '',
        sub_category: '',
        planned: false,
        source: '',
        notes: '',
    });

    const handleToggleField = (field: string) => {
        setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleCategoryChange = async (newCategory: string) => {
        if (newCategory === 'add-new') {
            const name = prompt("Enter new category name:");
            if (name) {
                await addCategory(name);
                setValues(prev => ({ ...prev, category: name, sub_category: '' }));
            }
            return;
        }

        if (newCategory.includes(':')) {
            const [cat, sub] = newCategory.split(':');
            setValues(prev => ({ ...prev, category: cat, sub_category: sub }));
        } else {
            setValues(prev => ({ ...prev, category: newCategory, sub_category: '' }));
        }
    };

    const handleSubCategoryChange = async (newValue: string) => {
        if (newValue === 'add-new') {
            const newSubCategory = prompt('Enter new sub-category:');
            if (newSubCategory && values.category) {
                await addSubCategory(values.category, newSubCategory);
                setValues(prev => ({ ...prev, sub_category: newSubCategory }));
            }
        } else {
            setValues(prev => ({ ...prev, sub_category: newValue }));
        }
    };


    const handleApply = () => {
        const updates: Partial<Transaction> = {};
        (Object.keys(enabledFields) as (keyof typeof enabledFields)[]).forEach(field => {
            if (enabledFields[field]) {
                if (field === 'unplanned') {
                    updates.planned = values.planned;
                } else {
                    (updates as any)[field] = values[field as keyof Transaction];
                }
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
                        {/* Source */}
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-source"
                                checked={enabledFields.source}
                                onCheckedChange={() => handleToggleField('source')}
                            />
                            <div className="grid flex-1 gap-1.5">
                                <Label htmlFor="source">Source</Label>
                                <Input
                                    id="source"
                                    disabled={!enabledFields.source}
                                    value={values.source}
                                    onChange={(e) => setValues({ ...values, source: e.target.value })}
                                    placeholder="e.g. Amazon"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-notes"
                                checked={enabledFields.notes}
                                onCheckedChange={() => handleToggleField('notes')}
                            />
                            <div className="grid flex-1 gap-1.5">
                                <Label htmlFor="notes">Notes</Label>
                                <Input
                                    id="notes"
                                    disabled={!enabledFields.notes}
                                    value={values.notes}
                                    onChange={(e) => setValues({ ...values, notes: e.target.value })}
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
                                        <SelectItem value="Pending Triage">Pending Triage</SelectItem>
                                        <SelectItem value="Pending Reconciliation">Pending Reconciliation</SelectItem>
                                        <SelectItem value="Review Needed">Review Needed</SelectItem>
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
                                <CategorySelector
                                    disabled={!enabledFields.category}
                                    value={values.category}
                                    onValueChange={handleCategoryChange}
                                    type="all"
                                    suggestionLimit={3}
                                    onAddCategory={() => { }}
                                />
                            </div>
                        </div>

                        {/* Sub-category */}
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-subCategory"
                                checked={enabledFields.sub_category}
                                onCheckedChange={() => handleToggleField('sub_category')}
                            />
                            <div className="grid flex-1 gap-1.5">
                                <Label htmlFor="sub_category">Sub-category</Label>
                                <SmartSelector
                                    disabled={!enabledFields.sub_category || !values.category}
                                    value={values.sub_category}
                                    onValueChange={handleSubCategoryChange}
                                    options={[
                                        ...(displaySubCategories?.[values.category || '']?.map(sub => ({ label: sub, value: sub })) || []),
                                        ...(values.category ? [{ label: '+ Add New Sub-category', value: 'add-new' }] : [])
                                    ]}
                                    placeholder={values.category ? "Select sub-category" : "Select a category first"}
                                />
                            </div>
                        </div>

                        {/* Planned - Removed/Hidden */}
                        {/* 
                        <div className="flex items-center space-x-4">
                            <Checkbox
                                id="edit-unplanned"
                                checked={enabledFields.unplanned}
                                onCheckedChange={() => handleToggleField('unplanned')}
                            />
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="unplanned"
                                    disabled={!enabledFields.unplanned}
                                    checked={!values.planned}
                                    onCheckedChange={(v) => setValues({ ...values, planned: !v })}
                                />
                                <Label htmlFor="unplanned">Mark as Unplanned</Label>
                            </div>
                        </div>
                        */}

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
