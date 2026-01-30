import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatUtils';
import { BudgetCategory, BudgetSubCategory } from '@/hooks/useAnnualBudget';

interface EditableCellProps {
    value: number;
    onUpdate: (val: string) => Promise<void>;
    currency: string;
    isPercent?: boolean;
    className?: string;
    isEditing: boolean;
    onEdit: () => void;
    onCancel: () => void;
    lastYearData?: { budget: number, spent: number };
    selectedYear: number;
    annualMultiplier?: number;
}

const EditableCell = ({ value, onUpdate, currency, isPercent, className, isEditing, onEdit, onCancel, lastYearData, selectedYear, annualMultiplier = 1 }: EditableCellProps) => {
    const [localValue, setLocalValue] = React.useState<string>("");
    const [isSaving, setIsSaving] = React.useState(false);

    // Update local value when prop value changes OR when we start editing
    React.useEffect(() => {
        if (!isEditing) {
            // Show 1 decimal place for percentages if not a whole number
            const formatted = isPercent
                ? (Math.round(value * 10) / 10).toString()
                : Math.round(value).toString();
            setLocalValue(formatted === "0" ? "" : formatted);
        }
    }, [value, isEditing, isPercent]);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await onUpdate(localValue);
        } finally {
            setIsSaving(false);
        }
    };

    if (isEditing) {
        const lastYearBudgetVal = (lastYearData && !isPercent) ? (lastYearData.budget * annualMultiplier).toString() : null;

        return (
            <td className={`py-2 px-3 text-right font-medium text-muted-foreground ${className}`}>
                <div className="flex flex-col items-end gap-1.5">
                    <Input
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
                        className="w-20 h-6 text-right bg-background text-[10px] focus-visible:ring-blue-500 shadow-sm border-blue-200"
                        autoFocus
                        disabled={isSaving}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => {
                            const originalStr = value.toString();
                            if (localValue !== originalStr) {
                                handleSave();
                            } else {
                                onCancel();
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSave();
                            } else if (e.key === 'Escape') {
                                onCancel();
                            }
                        }}
                    />
                    {lastYearBudgetVal && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setLocalValue(lastYearBudgetVal);
                            }}
                            className="text-[9px] text-blue-500 hover:text-blue-700 font-bold uppercase tracking-tight transition-colors flex items-center gap-1 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100/50 whitespace-nowrap"
                        >
                            <span>Copy from {selectedYear - 1}</span>
                            <span className="font-mono text-blue-600/70">({formatCurrency(Number(lastYearBudgetVal), currency)})</span>
                        </button>
                    )}
                </div>
            </td>
        );
    }

    return (
        <td className={`py-2 px-3 text-right font-medium text-muted-foreground ${className}`}>
            <div
                className="cursor-pointer hover:text-blue-500 rounded inline-flex items-center hover:bg-accent transition-all px-2 py-1"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
                {isPercent
                    ? (value > 1000 ? '0,0%' : `${(Math.round(value * 10) / 10).toLocaleString('da-DK')}%`)
                    : formatCurrency(value, currency)}
            </div>
        </td>
    );
};

interface BudgetTableProps {
    data: BudgetCategory[];
    type: 'income' | 'expense' | 'klintemarken' | 'special';
    title?: string;
    expandedCategories: Set<string>;
    toggleCategory: (cat: string) => void;
    editingBudget: string | null;
    setEditingBudget: (key: string | null) => void;
    handleUpdateBudget: (parent: BudgetCategory, sub: BudgetSubCategory, val: string, type: 'annual' | 'monthly' | 'percent', key: string) => Promise<void>;
    totalIncome: number;
    currency: string;
    selectedYear: number;
}

export const BudgetTable = ({
    data,
    type,
    title,
    expandedCategories,
    toggleCategory,
    editingBudget,
    setEditingBudget,
    handleUpdateBudget,
    totalIncome,
    currency,
    selectedYear
}: BudgetTableProps) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12

    const elapsedMonths = selectedYear < currentYear ? 12 :
        selectedYear > currentYear ? 0 :
            currentMonth;

    const editingKey = (parentId: string, subId: string, field: 'annual' | 'monthly' | 'percent') => `${parentId}-${subId}-${field}`;

    const renderSubCategories = (item: BudgetCategory, isExpanded: boolean) => {
        if (!isExpanded) return null;
        return item.sub_categories.map((subcat, subIndex) => {
            const annualKey = editingKey(item.id, subcat.id, 'annual');
            const monthlyKey = editingKey(item.id, subcat.id, 'monthly');
            const percentKey = editingKey(item.id, subcat.id, 'percent');

            return (
                <tr
                    key={`${item.id}-${subcat.id}-${subIndex}`}
                    className={`text-[11px] text-muted-foreground/80 ${type === 'income' ? 'bg-emerald-500/5' : type === 'klintemarken' ? 'bg-blue-500/5' : type === 'special' ? 'bg-purple-500/5' : 'bg-rose-500/5'}`}
                >
                    <td className="py-2 px-6"></td>
                    <td className="py-2 px-2 italic pl-6 font-medium">└ {subcat.name}</td>
                    <EditableCell
                        value={(subcat.budget_amount || 0) * 12}
                        isEditing={editingBudget === annualKey}
                        onEdit={() => setEditingBudget(annualKey)}
                        onCancel={() => setEditingBudget(null)}
                        onUpdate={(val) => handleUpdateBudget(item, subcat, val, 'annual', annualKey)}
                        currency={currency}
                        lastYearData={subcat.last_year_data}
                        selectedYear={selectedYear}
                        annualMultiplier={12}
                    />
                    <EditableCell
                        value={subcat.budget_amount || 0}
                        isEditing={editingBudget === monthlyKey}
                        onEdit={() => setEditingBudget(monthlyKey)}
                        onCancel={() => setEditingBudget(null)}
                        onUpdate={(val) => handleUpdateBudget(item, subcat, val, 'monthly', monthlyKey)}
                        currency={currency}
                        lastYearData={subcat.last_year_data}
                        selectedYear={selectedYear}
                        annualMultiplier={1}
                    />
                    <EditableCell
                        value={totalIncome > 0.1 ? ((subcat.budget_amount || 0) / totalIncome) * 100 : 0}
                        isEditing={editingBudget === percentKey}
                        onEdit={() => setEditingBudget(percentKey)}
                        onCancel={() => setEditingBudget(null)}
                        onUpdate={(val) => handleUpdateBudget(item, subcat, val, 'percent', percentKey)}
                        currency={currency}
                        isPercent
                        selectedYear={selectedYear}
                    />
                    <td className="py-2 px-6 text-right font-mono text-[10px] text-muted-foreground/60">
                        {formatCurrency((subcat.budget_amount || 0) * elapsedMonths, currency)}
                    </td>
                    <td className="py-2 px-6 text-right font-bold text-foreground/70">{formatCurrency(subcat.spent, currency)}</td>
                    <td className={`py-2 px-6 text-right font-mono text-[10px] ${((subcat.budget_amount || 0) * elapsedMonths) >= subcat.spent ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <div className="flex items-center justify-end gap-1">
                            {((subcat.budget_amount || 0) * elapsedMonths) < subcat.spent && <span className="text-[8px] opacity-70">OVER</span>}
                            {((subcat.budget_amount || 0) * elapsedMonths) > subcat.spent && <span className="text-[8px] opacity-70">UNDER</span>}
                            {formatCurrency(Math.abs(((subcat.budget_amount || 0) * elapsedMonths) - subcat.spent), currency)}
                        </div>
                    </td>
                </tr>
            );
        });
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className={`${type === 'income'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : type === 'klintemarken'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                            : type === 'special'
                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'} border-b uppercase text-[10px] font-bold tracking-widest`}>
                        <th className="py-3 px-6 w-8"></th>
                        <th className="py-3 px-2">{title || (type === 'income' ? 'Income' : type === 'klintemarken' ? 'Klintemarken' : type === 'special' ? 'Special' : 'Expenses')}</th>
                        <th className="py-3 px-3 text-right">Annual</th>
                        <th className="py-3 px-3 text-right">Monthly</th>
                        <th className="py-3 px-3 text-right">% of Total</th>
                        <th className="py-3 px-6 text-right">{selectedYear === currentYear ? 'Budget YTD' : 'Full Year Budget'}</th>
                        <th className="py-3 px-6 text-right">{selectedYear === currentYear ? 'Actual Spend YTD' : 'Actual Spend'}</th>
                        <th className="py-3 px-6 text-right">Vs Budget</th>
                    </tr>
                </thead>
                <tbody className={`divide-y ${type === 'income' ? 'divide-emerald-500/10' : type === 'klintemarken' ? 'divide-blue-500/10' : type === 'special' ? 'divide-purple-500/10' : 'divide-rose-500/10'}`}>
                    {data.map((item) => {
                        const isExpanded = expandedCategories.has(item.name);
                        return (
                            <React.Fragment key={item.name || 'unknown'}>
                                <tr
                                    className={`transition-colors group cursor-pointer border-b border-border/50 ${type === 'income' ? 'hover:bg-emerald-500/5' : type === 'klintemarken' ? 'hover:bg-blue-500/5' : type === 'special' ? 'hover:bg-purple-500/5' : 'hover:bg-rose-500/5'}`}
                                    onClick={(e) => {
                                        if ((e.target as HTMLElement).closest('td')?.querySelector('input, div[role="spinbutton"]')) {
                                            return;
                                        }
                                        toggleCategory(item.name);
                                    }}
                                >
                                    <td className="py-3 px-6 pl-8">
                                        {item.sub_categories.length > 0 && (
                                            isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </td>
                                    <td className="py-3 px-2 font-bold text-foreground">{item.name}</td>
                                    <td className="py-3 px-3 text-right font-bold text-muted-foreground/50" title="Calculated total from sub-categories">
                                        <div className="px-2 py-1">
                                            {formatCurrency(item.budget_amount * 12, currency)}
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 text-right font-bold text-muted-foreground/50" title="Calculated total from sub-categories">
                                        <div className="px-2 py-1">
                                            {formatCurrency(item.budget_amount, currency)}
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 text-right font-bold text-muted-foreground/50" title="Calculated total from sub-categories">
                                        <div className="px-2 py-1">
                                            {totalIncome > 0.1 ? (type === 'income' ? `${(Math.round((item.budget_amount / totalIncome) * 100 * 10) / 10).toLocaleString('da-DK')}%` : `${(Math.round((item.budget_amount / totalIncome) * 100 * 10) / 10).toLocaleString('da-DK')}%`) : '0%'}
                                        </div>
                                    </td>
                                    <td className="py-3 px-6 text-right font-mono text-xs text-muted-foreground/40">
                                        {formatCurrency(item.budget_amount * elapsedMonths, currency)}
                                    </td>
                                    <td className="py-3 px-6 text-right font-black text-foreground">{formatCurrency(item.spent, currency)}</td>
                                    <td className={`py-3 px-6 text-right font-bold transition-all duration-300 ${(item.budget_amount * elapsedMonths) >= item.spent ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-2">
                                                {(item.budget_amount * elapsedMonths) < item.spent && <span className="text-[9px] bg-rose-500 text-white px-1 rounded-sm tracking-tighter">OVER</span>}
                                                {(item.budget_amount * elapsedMonths) > item.spent && <span className="text-[9px] bg-emerald-500 text-white px-1 rounded-sm tracking-tighter text-[8px]">UNDER</span>}
                                                <span className="font-mono">{formatCurrency(Math.abs((item.budget_amount * elapsedMonths) - item.spent), currency)}</span>
                                            </div>
                                            {(item.budget_amount * elapsedMonths) > 0 && (
                                                <span className={`text-[10px] font-bold opacity-70 ${item.spent > (item.budget_amount * elapsedMonths) ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {Math.round((item.spent / (item.budget_amount * elapsedMonths)) * 100)}% of YTD budget
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {renderSubCategories(item, isExpanded)}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
