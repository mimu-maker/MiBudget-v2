import React from 'react';
import { ChevronDown, ChevronRight, Target, Circle, CheckCircle2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatPercentage } from '@/lib/formatUtils';
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
        // lastYearData.spent is always Annual. If we are in Monthly mode (multiplier=1), divide by 12. If Annual mode (multiplier=12), keep as is.
        const lastYearSpentVal = (lastYearData && !isPercent)
            ? (annualMultiplier === 12 ? lastYearData.spent : lastYearData.spent / 12).toString()
            : null;

        return (
            <td className={`py-2 px-3 text-right font-medium text-muted-foreground ${className}`}>
                <div className="flex flex-col items-end gap-1.5 pt-1 pb-1">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancel();
                            }}
                            className="p-1 flex items-center justify-center rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-transparent hover:border-rose-200 transition-all font-bold"
                            title="Cancel"
                        >
                            <LucideIcons.X className="w-3.5 h-3.5" />
                        </button>
                        <Input
                            value={localValue}
                            onChange={(e) => setLocalValue(e.target.value)}
                            className="w-20 h-7 text-right bg-white text-[11px] font-mono focus-visible:ring-blue-500 shadow-sm border-blue-300"
                            autoFocus
                            disabled={isSaving}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSave();
                                } else if (e.key === 'Escape') {
                                    onCancel();
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSave();
                            }}
                            disabled={isSaving}
                            className="p-1 flex items-center justify-center rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-transparent hover:border-emerald-200 transition-all font-bold disabled:opacity-50"
                            title="Save"
                        >
                            <LucideIcons.Check className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {lastYearBudgetVal && (
                        <div className="flex flex-col gap-1 items-end">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLocalValue(lastYearBudgetVal);
                                }}
                                className="text-[9px] text-blue-500 hover:text-blue-700 font-bold uppercase tracking-tight transition-colors flex items-center gap-1 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100/50 whitespace-nowrap"
                            >
                                <span>Copy {selectedYear - 1} Budget</span>
                                <span className="font-mono text-blue-600/70">({formatCurrency(Number(lastYearBudgetVal), currency)})</span>
                            </button>
                            {lastYearSpentVal && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLocalValue(lastYearSpentVal);
                                    }}
                                    className="text-[9px] text-amber-500 hover:text-amber-700 font-bold uppercase tracking-tight transition-colors flex items-center gap-1 bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-100/50 whitespace-nowrap"
                                >
                                    <span>Copy {selectedYear - 1} Actuals</span>
                                    <span className="font-mono text-amber-600/70">({formatCurrency(Number(lastYearSpentVal), currency)})</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </td>
        );
    }

    return (
        <td className={`py-2 px-3 text-right font-medium text-muted-foreground ${className}`}>
            <div
                className="cursor-pointer hover:text-blue-500 rounded inline-flex items-center hover:bg-accent transition-all px-2 py-1 whitespace-nowrap"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
                {isPercent
                    ? (value > 1000 ? '0,0%' : formatPercentage(value))
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
    hideHeader?: boolean;
    onToggleItem?: (itemName: string) => void;
    disabledItems?: Set<string>;
    isScenario?: boolean;
    projectionMode?: boolean;
    onBatchAdjust?: (categoryName: string, subCategoryName: string | null, percentage: number) => void;
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
    selectedYear,
    hideHeader = false,
    onToggleItem,
    disabledItems,
    isScenario = false,
    projectionMode = false,
    onBatchAdjust
}: BudgetTableProps) => {
    const isFixedOrVariableEssential = (name: string) =>
        name === 'Fixed Committed' || name === 'Variable Essential';

    const getExpenseTextColor = (name: string, defaultColor: string = 'text-rose-500') => {
        if (type !== 'expense') return defaultColor;
        const lowerName = name.toLowerCase();
        if (lowerName.includes('fixed') || lowerName === 'fc') return 'text-slate-500';
        if (lowerName.includes('variable') || lowerName === 've') return 'text-blue-500';
        if (lowerName.includes('discret')) return 'text-amber-500';
        if (lowerName.includes('unlabeled')) return 'text-red-500';
        return defaultColor;
    };

    const getExpenseBgColor = (name: string, defaultColor: string = 'hover:bg-rose-500/5') => {
        if (type !== 'expense') return defaultColor;
        const lowerName = name.toLowerCase();
        if (lowerName.includes('fixed') || lowerName === 'fc') return 'bg-slate-50/40 hover:bg-slate-500/5 border-slate-100';
        if (lowerName.includes('variable') || lowerName === 've') return 'bg-blue-50/30 hover:bg-blue-500/5 border-blue-100';
        if (lowerName.includes('discret')) return 'bg-amber-50/30 hover:bg-amber-500/5 border-amber-100';
        if (lowerName.includes('unlabeled')) return 'bg-red-50/30 hover:bg-red-500/5 border-red-100';
        return defaultColor;
    };

    const renderVariance = (avg: number, budget: number) => {
        if (!budget || budget === 0) return null;
        const variance = ((avg - budget) / budget) * 100;
        if (Math.abs(variance) < 0.5) return null; // Hide noise

        const isOver = variance > 0;
        const colorClass = isOver
            ? (type === 'income' ? 'text-emerald-500' : 'text-rose-500')
            : (type === 'income' ? 'text-rose-500' : 'text-emerald-500');

        return (
            <div className={`flex flex-col items-end leading-none ml-2 ${colorClass}`}>
                <span className="text-[8px] font-bold uppercase opacity-70 mb-0.5">{isOver ? 'Over' : 'Under'}</span>
                <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">
                    {isOver ? '+' : ''}{variance.toFixed(1)}%
                </span>
            </div>
        );
    };

    const AdjustButtons = ({ onAdjust }: { onAdjust: (p: number) => void }) => (
        <div className="flex items-center gap-0.5 ml-auto opacity-30 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {[10, 5, 0, -5, -10, -25].map(p => (
                <button
                    key={p}
                    onClick={(e) => { e.stopPropagation(); onAdjust(p); }}
                    className="px-1 py-0.5 text-[8px] font-black rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/50 transition-colors"
                >
                    {p === 0 ? '-' : (p > 0 ? `+${p}%` : `${p}%`)}
                </button>
            ))}
        </div>
    );
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12

    const elapsedMonths = selectedYear < currentYear ? 12 :
        selectedYear > currentYear ? 0 :
            currentMonth;
    const isFutureYear = selectedYear > currentYear;

    const CategoryIcon = ({ name, className }: { name?: string, className?: string }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const IconComponent = (LucideIcons as any)[name || 'Target'] || LucideIcons.Target || Target;
        return <IconComponent className={className} />;
    };

    const editingKey = (parentId: string, subId: string, field: 'annual' | 'monthly' | 'percent') => `${parentId}-${subId}-${field}`;

    const renderSubRow = (item: BudgetCategory, subcat: BudgetSubCategory, subIndex: number, displayName: string) => {
        const annualKey = editingKey(item.id, subcat.id, 'annual');
        const monthlyKey = editingKey(item.id, subcat.id, 'monthly');
        const percentKey = editingKey(item.id, subcat.id, 'percent');

        return (
            <tr
                key={`${item.id}-${subcat.id}-${subIndex}`}
                className={`text-xs text-muted-foreground/80 ${type === 'income' ? 'bg-emerald-500/5' : type === 'klintemarken' ? 'bg-blue-500/5' : type === 'special' ? 'bg-purple-500/5' : type === 'expense' ? getExpenseTextColor(item.name).replace('text-', 'bg-').replace('500', '500/5') : 'bg-rose-500/5'} ${disabledItems?.has(subcat.name) ? 'opacity-30' : ''}`}
            >
                <td className="py-2 px-4">
                    <div className="flex items-center justify-center gap-2">
                        {onToggleItem && !isFixedOrVariableEssential(item.name) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleItem(subcat.name); }}
                                className="hover:scale-110 transition-transform flex-shrink-0"
                            >
                                {disabledItems?.has(subcat.name) ? (
                                    <Circle className="w-3.5 h-3.5 text-slate-300" />
                                ) : (
                                    <CheckCircle2 className={`w-3.5 h-3.5 ${type === 'income' ? 'text-emerald-500' : type === 'expense' ? getExpenseTextColor(item.name) : 'text-rose-500'}`} />
                                )}
                            </button>
                        )}
                        <div className="w-4 h-4 flex-shrink-0" /> {/* Spacer for caret alignment */}
                    </div>
                </td>
                <td className="py-2 px-2 italic pl-10 font-medium">
                    <div className="flex items-center justify-between group">
                        <span>└ {displayName}</span>
                        {projectionMode && isScenario && onBatchAdjust && item.name === 'Variable Essential' && (
                            <AdjustButtons onAdjust={(p) => onBatchAdjust(item.name, subcat.name, p)} />
                        )}
                    </div>
                </td>

                {projectionMode ? (
                    <>
                        <td className="py-2 px-3 text-right font-medium whitespace-nowrap font-mono text-[10px]">
                            <div className="flex items-center justify-end gap-1 text-muted-foreground/60">
                                <span>{formatCurrency((subcat as any).avg_6m || 0, currency)}</span>
                                {renderVariance((subcat as any).avg_6m || 0, subcat.budget_amount || 0)}
                            </div>
                        </td>
                        <td className="py-2 px-3 text-right font-medium whitespace-nowrap font-mono text-[10px]">
                            <div className="flex items-center justify-end gap-1 text-muted-foreground/60">
                                <span>{formatCurrency((subcat as any).avg_1y || 0, currency)}</span>
                                {renderVariance((subcat as any).avg_1y || 0, subcat.budget_amount || 0)}
                            </div>
                        </td>
                        <td className="py-2 px-3 text-right font-medium opacity-50 whitespace-nowrap font-mono text-[10px]">
                            {formatCurrency(subcat.budget_amount || 0, currency)}
                        </td>
                        <td className="py-2 px-6 text-right font-medium whitespace-nowrap font-mono text-[10px]">
                            <div className="flex items-center justify-end">
                                <EditableCell
                                    value={(subcat as any).expected_amount ?? (subcat.budget_amount || 0)}
                                    isEditing={editingBudget === monthlyKey}
                                    onEdit={() => setEditingBudget(monthlyKey)}
                                    onCancel={() => setEditingBudget(null)}
                                    onUpdate={(val) => handleUpdateBudget(item, subcat, val, 'monthly', monthlyKey)}
                                    currency={currency}
                                    lastYearData={subcat.last_year_data}
                                    selectedYear={selectedYear}
                                    annualMultiplier={1}
                                    className="!px-0 !py-0"
                                />
                                {renderVariance((subcat as any).expected_amount ?? (subcat.budget_amount || 0), subcat.budget_amount || 0)}
                            </div>
                        </td>
                    </>
                ) : (
                    <>
                        <EditableCell
                            value={(subcat.budget_amount || 0) * 12}
                            isEditing={editingBudget === annualKey}
                            onEdit={() => type !== 'special' && setEditingBudget(annualKey)}
                            onCancel={() => setEditingBudget(null)}
                            onUpdate={(val) => type !== 'special' ? handleUpdateBudget(item, subcat, val, 'annual', annualKey) : Promise.resolve()}
                            currency={currency}
                            lastYearData={subcat.last_year_data}
                            selectedYear={selectedYear}
                            annualMultiplier={12}
                        />
                        <EditableCell
                            value={subcat.budget_amount || 0}
                            isEditing={editingBudget === monthlyKey}
                            onEdit={() => type !== 'special' && setEditingBudget(monthlyKey)}
                            onCancel={() => setEditingBudget(null)}
                            onUpdate={(val) => type !== 'special' ? handleUpdateBudget(item, subcat, val, 'monthly', monthlyKey) : Promise.resolve()}
                            currency={currency}
                            lastYearData={subcat.last_year_data}
                            selectedYear={selectedYear}
                            annualMultiplier={1}
                        />
                    </>
                )}

                {!projectionMode && (
                    <td className="py-2 px-6 text-right font-bold text-foreground/70 whitespace-nowrap">{formatCurrency(subcat.spent, currency)}</td>
                )}

            </tr>
        );
    };

    const renderSubCategories = (item: BudgetCategory, isExpanded: boolean) => {
        if (!isExpanded) return null;

        if (type === 'expense' && item.sub_categories.some(s => s.name.includes(' - '))) {
            const grouped: Record<string, BudgetSubCategory[]> = {};
            item.sub_categories.forEach(sub => {
                const parts = sub.name.split(' - ');
                const catName = parts.length > 1 ? parts[0] : 'Other';
                const subName = parts.slice(1).join(' - ') || sub.name;
                if (!grouped[catName]) grouped[catName] = [];
                grouped[catName].push({ ...sub, display_name: subName } as any);
            });

            const rows: JSX.Element[] = [];
            Object.entries(grouped).forEach(([catName, subs]) => {
                rows.push(
                    <tr key={`header-${item.id}-${catName}`} className="text-xs font-bold bg-slate-50/40 text-slate-700">
                        <td className="py-1.5 px-4 font-mono font-black" colSpan={projectionMode ? 6 : 5}>
                            <div className="pl-6 uppercase tracking-wider text-[10px] text-slate-500 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                {catName}
                            </div>
                        </td>
                    </tr>
                );
                subs.forEach((subcat: any, subIndex) => {
                    rows.push(renderSubRow(item, subcat, subIndex, subcat.display_name));
                });
            });
            return rows;
        }

        return item.sub_categories.map((subcat, subIndex) => renderSubRow(item, subcat, subIndex, subcat.name));
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed">
                {projectionMode ? (
                    <colgroup>
                        <col className="w-10" />
                        <col className="w-auto" />
                        <col className="w-[12%]" />
                        <col className="w-[12%]" />
                        <col className="w-[12%]" />
                        <col className="w-[15%]" />
                    </colgroup>
                ) : (
                    <colgroup>
                        <col className="w-20" />
                        <col className="w-auto" />
                        <col className="w-[15%]" />
                        <col className="w-[15%]" />
                        <col className="w-[20%]" />
                    </colgroup>
                )}
                {!hideHeader && (
                    <thead>
                        <tr className={`${type === 'income'
                            ? 'bg-emerald-50/50 text-emerald-900'
                            : type === 'klintemarken'
                                ? 'bg-blue-50/50 text-blue-900'
                                : type === 'special'
                                    ? 'bg-purple-50/50 text-purple-900'
                                    : type === 'expense'
                                        ? 'bg-rose-50/50 text-rose-900'
                                        : 'bg-slate-50 text-slate-900'} border-b uppercase text-[9px] font-black tracking-[0.2em]`}>
                            <th className="py-3 px-6 text-center">{projectionMode ? "" : "Sim"}</th>
                            <th className="py-3 px-2">{title || (type === 'income' ? 'Income' : type === 'klintemarken' ? 'Feeders' : 'Expenditure')}</th>

                            {projectionMode ? (
                                <>
                                    <th className="py-3 px-3 text-right whitespace-nowrap">Last 6M (avg/mo)</th>
                                    <th className="py-3 px-3 text-right whitespace-nowrap">Last 1Y (avg/mo)</th>
                                    <th className="py-3 px-3 text-right whitespace-nowrap">Budget (mo)</th>
                                    <th className="py-3 px-6 text-right whitespace-nowrap">Baseline (mo)</th>
                                </>
                            ) : (
                                <>
                                    <th className="py-3 px-3 text-right">Annual</th>
                                    <th className="py-3 px-3 text-right">Monthly</th>
                                    <th className="py-3 px-6 text-right">Year to Date</th>
                                </>
                            )}
                        </tr>
                    </thead>
                )}
                <tbody className={`divide-y ${type === 'income' ? 'divide-emerald-500/10' : type === 'klintemarken' ? 'divide-blue-500/10' : type === 'special' ? 'divide-purple-500/10' : 'divide-rose-500/10'}`}>
                    {data.map((item) => {
                        const isExpanded = expandedCategories.has(item.name);
                        return (
                            <React.Fragment key={item.name || 'unknown'}>
                                <tr
                                    className={`transition-colors group cursor-pointer border-b border-border/50 
                                        ${type === 'income' ? 'hover:bg-emerald-500/5' :
                                            type === 'klintemarken' ? 'hover:bg-blue-500/5' :
                                                (type === 'special' || item.name === 'Slush Fund') ? 'bg-purple-50/60 hover:bg-purple-100/60 border-purple-100' :
                                                    type === 'expense' ? getExpenseBgColor(item.name) : 'hover:bg-rose-500/5'}`}
                                    onClick={(e) => {
                                        if ((e.target as HTMLElement).closest('td')?.querySelector('input, div[role="spinbutton"]')) {
                                            return;
                                        }
                                        toggleCategory(item.name);
                                    }}
                                >
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {onToggleItem && !isFixedOrVariableEssential(item.name) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onToggleItem(item.name); }}
                                                    className="hover:scale-110 transition-transform flex-shrink-0"
                                                >
                                                    {disabledItems?.has(item.name) ? (
                                                        <Circle className="w-4 h-4 text-slate-300" />
                                                    ) : (
                                                        <CheckCircle2 className={`w-4 h-4 ${type === 'income' ? 'text-emerald-500' : type === 'expense' ? getExpenseTextColor(item.name) : 'text-rose-500'}`} />
                                                    )}
                                                </button>
                                            )}
                                            {item.sub_categories.length > 0 ? (
                                                <div className="w-4 h-4 flex-shrink-0">
                                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                </div>
                                            ) : (
                                                <div className="w-4 h-4" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 font-bold text-foreground">
                                        <div className="flex items-center justify-between group">
                                            {(type === 'special' || item.name === 'Slush Fund') ? (
                                                <div className="flex items-center gap-3 py-2">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                                                        <CategoryIcon name={item.icon || 'Sparkles'} className="w-6 h-6" />
                                                    </div>
                                                    <span className="text-lg font-bold text-purple-900 tracking-tight">{item.name}</span>
                                                </div>
                                            ) : (
                                                <span className={`text-lg font-bold ${type === 'expense' ? getExpenseTextColor(item.name, 'text-foreground') : 'text-foreground'}`}>
                                                    {item.name}
                                                </span>
                                            )}
                                            {projectionMode && isScenario && onBatchAdjust && item.name === 'Variable Essential' && (
                                                <AdjustButtons onAdjust={(p) => onBatchAdjust(item.name, null, p)} />
                                            )}
                                        </div>
                                    </td>

                                    {projectionMode ? (
                                        <>
                                            <td className="py-3 px-3 text-right font-bold whitespace-nowrap font-mono text-[11px]">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-foreground/60">{formatCurrency((item as any).avg_6m || 0, currency)}</span>
                                                    {renderVariance((item as any).avg_6m || 0, item.budget_amount || 0)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right font-bold whitespace-nowrap font-mono text-[11px]">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-foreground/60">{formatCurrency((item as any).avg_1y || 0, currency)}</span>
                                                    {renderVariance((item as any).avg_1y || 0, item.budget_amount || 0)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right font-bold opacity-50 whitespace-nowrap font-mono text-[11px]">
                                                {formatCurrency(item.budget_amount || 0, currency)}
                                            </td>
                                            <td className="py-3 px-6 text-right font-bold whitespace-nowrap font-mono text-[11px]">
                                                {item.sub_categories.length === 0 ? (
                                                    <div className="flex items-center justify-end">
                                                        <EditableCell
                                                            value={(item as any).expected_amount ?? (item.budget_amount || 0)}
                                                            isEditing={editingBudget === `${item.id}-monthly`}
                                                            onEdit={() => setEditingBudget(`${item.id}-monthly`)}
                                                            onCancel={() => setEditingBudget(null)}
                                                            onUpdate={(val) => handleUpdateBudget(item, { id: null, name: item.name } as any, val, 'monthly', `${item.id}-monthly`)}
                                                            currency={currency}
                                                            selectedYear={selectedYear}
                                                            lastYearData={item.last_year_data}
                                                            className="!px-0 !py-0"
                                                        />
                                                        {renderVariance((item as any).expected_amount ?? (item.budget_amount || 0), item.budget_amount || 0)}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end text-muted-foreground">
                                                        {formatCurrency((item as any).expected_amount ?? (item.budget_amount || 0), currency)}
                                                    </div>
                                                )}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <EditableCell
                                                value={item.budget_amount * 12}
                                                isEditing={editingBudget === `${item.id}-annual`}
                                                onEdit={() => (type === 'special' || item.name === 'Slush Fund') && setEditingBudget(`${item.id}-annual`)}
                                                onCancel={() => setEditingBudget(null)}
                                                onUpdate={(val) => handleUpdateBudget(item, { id: null, name: item.name } as any, val, 'annual', `${item.id}-annual`)}
                                                currency={currency}
                                                selectedYear={selectedYear}
                                                annualMultiplier={12}
                                                lastYearData={item.last_year_data}
                                                className={(type !== 'special' && item.name !== 'Slush Fund') ? 'opacity-50' : ''}
                                            />
                                            <EditableCell
                                                value={item.budget_amount}
                                                isEditing={editingBudget === `${item.id}-monthly`}
                                                onEdit={() => (type === 'special' || item.name === 'Slush Fund') && setEditingBudget(`${item.id}-monthly`)}
                                                onCancel={() => setEditingBudget(null)}
                                                onUpdate={(val) => handleUpdateBudget(item, { id: null, name: item.name } as any, val, 'monthly', `${item.id}-monthly`)}
                                                currency={currency}
                                                selectedYear={selectedYear}
                                                lastYearData={item.last_year_data}
                                                className={(type !== 'special' && item.name !== 'Slush Fund') ? 'opacity-50' : ''}
                                            />
                                        </>
                                    )}

                                    {!projectionMode && (
                                        <td className="py-3 px-6 text-right font-black text-slate-900 whitespace-nowrap">{formatCurrency(item.spent, currency)}</td>
                                    )}
                                </tr>
                                {renderSubCategories(item, isExpanded)}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div >
    );
};
