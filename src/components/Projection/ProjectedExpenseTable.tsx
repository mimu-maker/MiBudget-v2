import React, { useMemo, useState } from 'react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { Edit2, Check, X } from 'lucide-react';
import { FutureTransaction } from '@/types/projection';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export type RecurrenceMode = 'single' | 'monthly' | 'quarterly' | 'biannual' | 'annual';

interface ProjectedExpenseTableProps {
    categoryName: string;
    subCategoryName: string;
    baseAmount: number;
    projections: FutureTransaction[];
    onUpdateValue: (categoryName: string, subCategoryName: string, monthKey: string, amount: number, mode: RecurrenceMode) => void;
    currency: string;
}

const ProjectedExpenseTable = ({
    categoryName,
    subCategoryName,
    baseAmount,
    projections,
    onUpdateValue,
    currency
}: ProjectedExpenseTableProps) => {
    const [editingCell, setEditingCell] = useState<{ monthKey: string, value: string } | null>(null);

    const months = useMemo(() => {
        const today = startOfMonth(new Date());
        return Array.from({ length: 12 }, (_, i) => {
            const d = addMonths(today, i);
            return {
                key: format(d, 'yyyy-MM'),
                label: format(d, 'MMM yy'),
                date: d
            };
        });
    }, []);

    const getValue = (monthKey: string) => {
        // Find projection matching stream (subCategoryName) and category
        let actualCategoryName = categoryName;
        let actualStreamName = subCategoryName;

        // Handle labeled subcategories like "Fixed - Netflix"
        if (subCategoryName.includes(' - ')) {
            const parts = subCategoryName.split(' - ');
            actualCategoryName = parts[0];
            actualStreamName = parts.slice(1).join(' - ');
        }

        const proj = projections.find(p => p.stream === actualStreamName && p.category === actualCategoryName);
        if (!proj) return baseAmount;

        // Check for manual monthly overrides
        const override = proj.overrides?.[monthKey];
        if (override && override.amount !== undefined) return override.amount;

        // If it's a monthly recurring item, use the projection amount
        if (proj.recurring === 'Monthly' && proj.date.slice(0, 7) <= monthKey) return proj.amount;

        // Map other recurrences approximately
        const projMonth = proj.date.slice(0, 7);
        const diffMonths = (parseInt(monthKey.slice(0, 4)) - parseInt(projMonth.slice(0, 4))) * 12 + (parseInt(monthKey.slice(5, 7)) - parseInt(projMonth.slice(5, 7)));

        if (diffMonths >= 0) {
            if (proj.recurring === 'Quarterly' && diffMonths % 3 === 0) return proj.amount;
            if (proj.recurring === 'Bi-annually' && diffMonths % 6 === 0) return proj.amount;
            if (proj.recurring === 'Annually' && diffMonths % 12 === 0) return proj.amount;
        }

        if (projMonth === monthKey) return proj.amount; // exact match
        return baseAmount;
    };

    const handleStartEdit = (monthKey: string, currentVal: number) => {
        setEditingCell({ monthKey, value: '' });
    };

    const handleSave = (mode: RecurrenceMode) => {
        if (!editingCell) return;
        const amount = parseFloat(editingCell.value);
        if (!isNaN(amount)) {
            let actualCategoryName = categoryName;
            let actualStreamName = subCategoryName;
            if (subCategoryName.includes(' - ')) {
                const parts = subCategoryName.split(' - ');
                actualCategoryName = parts[0];
                actualStreamName = parts.slice(1).join(' - ');
            }
            onUpdateValue(actualCategoryName, actualStreamName, editingCell.monthKey, amount, mode);
        }
        setEditingCell(null);
    };

    // Calculate background color based on category/label for consistency
    const getBgColorClass = () => {
        const lower = categoryName.toLowerCase();
        if (lower.includes('fixed') || lower === 'fc') return 'bg-slate-50/80 hover:bg-slate-100/80';
        if (lower.includes('variable') || lower === 've') return 'bg-blue-50/50 hover:bg-blue-100/50';
        if (lower.includes('discret')) return 'bg-amber-50/50 hover:bg-amber-100/50';
        if (lower.includes('unlabeled')) return 'bg-red-50/50 hover:bg-red-100/50';
        return 'bg-rose-50/50 hover:bg-rose-100/50';
    };

    const getTextColorClass = () => {
        const lower = categoryName.toLowerCase();
        if (lower.includes('fixed') || lower === 'fc') return 'text-slate-700';
        if (lower.includes('variable') || lower === 've') return 'text-blue-700';
        if (lower.includes('discret')) return 'text-amber-700';
        if (lower.includes('unlabeled')) return 'text-red-700';
        return 'text-rose-700';
    };

    return (
        <div className="overflow-x-auto w-full px-2 py-3 border-y border-dashed border-slate-200 shadow-inner bg-slate-50/30">
            <div className="flex items-center gap-2 mb-2 px-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Projected Timeline: {subCategoryName}</span>
            </div>
            <table className="w-full border-collapse rounded-lg overflow-hidden">
                <thead>
                    <tr className="bg-white/50 border-b border-slate-100">
                        {months.map(m => (
                            <th key={m.key} className="py-2 px-2 text-right font-black text-[9px] uppercase tracking-widest text-slate-400 min-w-[80px]">
                                {m.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr className={cn(getBgColorClass(), "transition-colors group")}>
                        {months.map(m => {
                            const val = getValue(m.key);
                            const isEditing = editingCell?.monthKey === m.key;

                            return (
                                <td key={m.key} className="py-2 px-2 text-right border-r border-white/50 last:border-0 relative">
                                    {isEditing ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white shadow-sm z-10 px-1 border border-slate-200">
                                            <div className="flex items-center gap-1 edit-cell-container-exp w-full">
                                                <Input
                                                    value={editingCell.value}
                                                    onChange={(e) => setEditingCell({ value: e.target.value, monthKey: m.key })}
                                                    className="h-6 w-full text-xs text-right pr-1 font-mono focus-visible:ring-1 focus-visible:ring-slate-300 px-1 border-slate-200"
                                                    autoFocus
                                                    onBlur={(e) => {
                                                        setTimeout(() => {
                                                            const activeElement = document.activeElement;
                                                            const container = e.currentTarget.closest('.edit-cell-container-exp');
                                                            if (!container?.contains(activeElement) && !document.querySelector('[data-radix-popper-content-wrapper]')?.contains(activeElement)) {
                                                                setEditingCell(null);
                                                            }
                                                        }, 150);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') setEditingCell(null);
                                                    }}
                                                />
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-600 hover:bg-slate-100 flex-shrink-0">
                                                            <Check className="w-3 h-3" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-56 p-2 shadow-xl border-slate-200 rounded-xl" side="bottom" align="end">
                                                        <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider text-center">Repeat Options</p>
                                                        <div className="space-y-1">
                                                            <Button size="sm" variant="ghost" className="w-full justify-start text-xs h-7 font-semibold" onClick={() => handleSave('single')}>Apply Only to {m.label}</Button>
                                                            <div className="h-px bg-slate-100 my-1"></div>
                                                            <Button size="sm" variant="ghost" className="w-full justify-start text-xs h-7 font-semibold" onClick={() => handleSave('monthly')}>Recur Monthly</Button>
                                                            <Button size="sm" variant="ghost" className="w-full justify-start text-xs h-7 font-semibold" onClick={() => handleSave('quarterly')}>Recur Quarterly</Button>
                                                            <Button size="sm" variant="ghost" className="w-full justify-start text-xs h-7 font-semibold" onClick={() => handleSave('biannual')}>Recur Bi-Annually</Button>
                                                            <Button size="sm" variant="ghost" className="w-full justify-start text-xs h-7 font-semibold" onClick={() => handleSave('annual')}>Recur Annually</Button>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:bg-slate-100 flex-shrink-0" onClick={() => setEditingCell(null)}>
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className={cn("font-mono text-xs inline-flex w-full justify-end items-center gap-1 cursor-pointer py-1 px-1 rounded transition-all", getTextColorClass())}
                                            onClick={() => handleStartEdit(m.key, val)}
                                        >
                                            <span className={cn(
                                                "font-semibold",
                                                val !== baseAmount ? "underline decoration-dotted underline-offset-2 opacity-100" : "opacity-70"
                                            )}>
                                                {val === 0 ? '-' : Math.round(val).toLocaleString()}
                                            </span>
                                            <Edit2 className="w-[10px] h-[10px] opacity-0 group-hover:opacity-40 transition-opacity" />
                                        </div>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default ProjectedExpenseTable;
