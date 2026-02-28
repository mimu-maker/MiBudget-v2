import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { format } from 'date-fns';
import { ArrowRightLeft, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMultiYearBudgets } from '@/hooks/useBudgetCategories';
import { SmartSelector } from '@/components/ui/smart-selector';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoryName: string;
    subCategoryName: string;
}

export const SubcategoryTransactionsDialog = ({ open, onOpenChange, categoryName, subCategoryName }: Props) => {
    const { transactions, bulkUpdate } = useTransactionTable();
    const { settings } = useSettings();
    const { categories, deleteSubCategory } = useMultiYearBudgets();
    const { toast } = useToast();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isMoveMode, setIsMoveMode] = useState(false);
    const [targetCategory, setTargetCategory] = useState<string>('');
    const [targetSubCategory, setTargetSubCategory] = useState<string>('');
    const [showDeletePrompt, setShowDeletePrompt] = useState(false);

    // Filter transactions for this specific subcategory
    const subCatsTxs = useMemo(() => {
        return transactions.filter(t =>
            (t.category === categoryName && t.sub_category === subCategoryName) ||
            (t.category === categoryName && (t as any).subCategory === subCategoryName) // Handle legacy camelCase if any
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, categoryName, subCategoryName]);

    const isAllSelected = subCatsTxs.length > 0 && selectedIds.size === subCatsTxs.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(subCatsTxs.map(t => t.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const availableCategories = useMemo(() => {
        return categories?.map(c => c.name) || [];
    }, [categories]);

    const availableSubCategories = useMemo(() => {
        if (!targetCategory) return [];
        const cat = categories?.find(c => c.name === targetCategory);
        return cat?.sub_categories?.map(sc => sc.name) || [];
    }, [categories, targetCategory]);

    const handleMove = async () => {
        if (!targetCategory || !targetSubCategory || selectedIds.size === 0) return;

        // Will moving these empty the subcategory?
        const willEmpty = selectedIds.size === subCatsTxs.length;

        // Perform move
        await bulkUpdate({
            ids: Array.from(selectedIds),
            updates: { category: targetCategory, sub_category: targetSubCategory }
        });

        toast({
            title: "Transactions Moved",
            description: `Moved ${selectedIds.size} transactions to ${targetCategory} > ${targetSubCategory}.`,
        });

        setSelectedIds(new Set());
        setIsMoveMode(false);
        setTargetCategory('');
        setTargetSubCategory('');

        if (willEmpty) {
            setShowDeletePrompt(true);
        }
    };

    const handleDeleteSubcategory = async () => {
        const catRecord = categories?.find(c => c.name === categoryName);
        const subRecord = catRecord?.sub_categories?.find(s => s.name === subCategoryName);

        if (subRecord) {
            await deleteSubCategory.mutateAsync({ subCategoryId: subRecord.id });
            toast({
                title: "Subcategory Deleted",
                description: `"${subCategoryName}" has been removed.`,
            });
        }
        setShowDeletePrompt(false);
        onOpenChange(false);
    };

    return (
        <>
            <Dialog open={open && !showDeletePrompt} onOpenChange={(val) => {
                if (!val) {
                    setSelectedIds(new Set());
                    setIsMoveMode(false);
                }
                onOpenChange(val);
            }}>
                <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[85vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Transactions for <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{categoryName} &gt; {subCategoryName}</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto min-h-[300px] py-4 pr-2 -mr-2">
                        {subCatsTxs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                                <p>No transactions found for this subcategory.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 w-10 text-center border-b"><Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} /></th>
                                        <th className="p-3 font-bold text-slate-600 border-b">Date</th>
                                        <th className="p-3 font-bold text-slate-600 border-b">Description</th>
                                        <th className="p-3 font-bold text-slate-600 border-b text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subCatsTxs.map(tx => (
                                        <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="p-3 text-center"><Checkbox checked={selectedIds.has(tx.id)} onCheckedChange={() => toggleSelect(tx.id)} /></td>
                                            <td className="p-3 text-slate-600 whitespace-nowrap">{format(new Date(tx.date), 'MMM d, yyyy')}</td>
                                            <td className="p-3 font-medium text-slate-900 truncate max-w-[200px]">{tx.description}</td>
                                            <td className={cn("p-3 text-right font-bold whitespace-nowrap", tx.amount > 0 ? "text-green-600" : "text-slate-900")}>
                                                {formatCurrency(tx.amount, settings.currency)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-200 pt-4 mt-auto">
                        <div className="text-sm text-slate-500 font-medium">
                            {selectedIds.size} selected
                        </div>
                        {isMoveMode ? (
                            <div className="flex items-center gap-2">
                                <Select value={targetCategory} onValueChange={(v) => { setTargetCategory(v); setTargetSubCategory(''); }}>
                                    <SelectTrigger className="w-[160px] h-8 text-xs">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCategories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <SmartSelector
                                    disabled={!targetCategory}
                                    value={targetSubCategory}
                                    onValueChange={setTargetSubCategory}
                                    options={availableSubCategories.map(s => ({ label: s, value: s }))}
                                    placeholder="Subcategory"
                                />
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsMoveMode(false)}>Cancel</Button>
                                <Button size="sm" className="h-8 bg-blue-600" disabled={!targetCategory || !targetSubCategory} onClick={handleMove}>Confirm Move</Button>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                disabled={selectedIds.size === 0}
                                onClick={() => setIsMoveMode(true)}
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                                Move Selected
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeletePrompt} onOpenChange={setShowDeletePrompt}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Subcategory Empty</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have moved all transactions out of <strong>{subCategoryName}</strong>.
                            Would you like to delete this empty subcategory?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => onOpenChange(false)}>Keep It</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSubcategory} className="bg-red-600 focus:ring-red-600 text-white">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Subcategory
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
