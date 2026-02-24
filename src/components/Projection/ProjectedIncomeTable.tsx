import React, { useMemo, useState } from 'react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { ChevronRight, ChevronDown, CheckCircle2, Circle, Edit2, Check, X, Info } from 'lucide-react';
import { BudgetSubCategory, BudgetCategory } from '@/hooks/useAnnualBudget';
import { FutureTransaction } from '@/types/projection';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface ProjectedIncomeTableProps {
    incomeCategories: BudgetCategory[];
    projections: FutureTransaction[];
    disabledStreams: Set<string>;
    onToggleStream: (streamName: string) => void;
    onUpdateValue: (streamName: string, categoryName: string, monthKey: string, amount: number, mode: 'single' | 'forward') => void;
    currency: string;
}

const ProjectedIncomeTable = ({
    incomeCategories,
    projections,
    disabledStreams,
    onToggleStream,
    onUpdateValue,
    currency
}: ProjectedIncomeTableProps) => {
    const [editingCell, setEditingCell] = useState<{ stream: string, monthKey: string, value: string } | null>(null);

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

    const allSubCategories = useMemo(() => {
        const subs: { sub: BudgetSubCategory; cat: BudgetCategory }[] = [];
        incomeCategories.forEach(cat => {
            cat.sub_categories.forEach(sub => {
                subs.push({ sub, cat });
            });
        });
        return subs.sort((a, b) => a.sub.name.localeCompare(b.sub.name));
    }, [incomeCategories]);

    const getValue = (streamName: string, categoryName: string, monthKey: string, baseAmount: number) => {
        // Find a projection that matches this stream
        const proj = projections.find(p => p.stream === streamName && p.category === categoryName);
        if (!proj) return baseAmount;

        // Check for monthly override
        const override = proj.overrides?.[monthKey];
        if (override && override.amount !== undefined) return override.amount;

        // Fallback to projection base amount if it's recurring or matches date
        // Actually, if it's 'Monthly', use projection amount.
        if (proj.recurring === 'Monthly' && proj.date.slice(0, 7) <= monthKey) return proj.amount;

        // For other recurring types, we rely on the calculateData logic, 
        // but for the table view, showing the "planned" amount for that month is complex.
        // Simplification: if it matches the projection date/month exactly, show proj.amount.
        const projMonth = proj.date.slice(0, 7);
        if (projMonth === monthKey) return proj.amount;

        // Default to base budget if no specific projection matches this month
        return baseAmount;
    };

    const handleStartEdit = (stream: string, monthKey: string, currentVal: number) => {
        setEditingCell({ stream, monthKey, value: '' });
    };

    const handleSave = (categoryName: string, mode: 'single' | 'forward') => {
        if (!editingCell) return;
        const amount = parseFloat(editingCell.value);
        if (!isNaN(amount)) {
            onUpdateValue(editingCell.stream, categoryName, editingCell.monthKey, amount, mode);
        }
        setEditingCell(null);
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-emerald-50/30 border-b border-emerald-100">
                        <th className="py-3 px-4 text-left w-10"></th>
                        <th className="py-3 px-4 text-left font-black text-[10px] uppercase tracking-widest text-emerald-800/50">Income Source</th>
                        {months.map(m => (
                            <th key={m.key} className="py-3 px-2 text-right font-black text-[10px] uppercase tracking-widest text-emerald-800/50 min-w-[100px]">
                                {m.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {allSubCategories.map(({ sub, cat }) => {
                        const isDisabled = disabledStreams.has(sub.name);
                        return (
                            <tr
                                key={`${cat.name}-${sub.name}`}
                                className={cn(
                                    "border-b border-emerald-50/50 hover:bg-emerald-50/20 transition-colors group",
                                    isDisabled && "opacity-40"
                                )}
                            >
                                <td className="py-3 px-4">
                                    <button
                                        onClick={() => onToggleStream(sub.name)}
                                        className="text-emerald-600 hover:text-emerald-800 transition-colors"
                                    >
                                        {isDisabled ? <Circle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                </td>
                                <td className="py-3 px-4 text-sm font-bold text-gray-700 whitespace-nowrap">
                                    {sub.name}
                                </td>
                                {months.map(m => {
                                    const val = getValue(sub.name, cat.name, m.key, sub.budget_amount);
                                    const isEditing = editingCell?.stream === sub.name && editingCell?.monthKey === m.key;

                                    return (
                                        <td key={m.key} className="py-3 px-2 text-right">
                                            {isEditing ? (
                                                <div className="flex flex-col items-end gap-1 edit-cell-container">
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            value={editingCell.value}
                                                            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                                            className="h-7 w-20 text-xs text-right pr-1 font-mono focus-visible:ring-emerald-500"
                                                            autoFocus
                                                            onBlur={(e) => {
                                                                // Small delay to allow click events on buttons/popover to register first
                                                                setTimeout(() => {
                                                                    const activeElement = document.activeElement;
                                                                    const container = e.currentTarget.closest('.edit-cell-container');
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
                                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50">
                                                                    <Check className="w-4 h-4" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-64 p-3 shadow-xl border-emerald-100 rounded-2xl">
                                                                <p className="text-xs font-bold text-emerald-800 mb-3 uppercase tracking-wider text-center">Update Options</p>
                                                                <div className="space-y-2">
                                                                    <Button
                                                                        className="w-full justify-start text-xs h-9 font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-none shadow-none"
                                                                        onClick={() => handleSave(cat.name, 'single')}
                                                                    >
                                                                        Apply only to {m.label}
                                                                    </Button>
                                                                    <Button
                                                                        className="w-full justify-start text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md"
                                                                        onClick={() => handleSave(cat.name, 'forward')}
                                                                    >
                                                                        Apply to {m.label} & moving forward
                                                                    </Button>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                        <button
                                                            onClick={() => setEditingCell(null)}
                                                            className="text-gray-400 hover:text-gray-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="font-mono text-sm inline-flex items-center gap-1.5 cursor-pointer hover:bg-emerald-50 px-2 py-1 rounded transition-all"
                                                    onClick={() => handleStartEdit(sub.name, m.key, val)}
                                                >
                                                    <span className={cn(
                                                        "font-bold",
                                                        val !== sub.budget_amount ? "text-emerald-700 underline decoration-dotted decoration-emerald-300 underline-offset-4" : "text-gray-600"
                                                    )}>
                                                        {Math.round(val).toLocaleString()}
                                                    </span>
                                                    <Edit2 className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ProjectedIncomeTable;
