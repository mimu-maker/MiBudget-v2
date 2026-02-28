import * as React from "react";
import {
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator
} from "@/components/ui/select";
import {
    CommandGroup,
    CommandItem,
    CommandSeparator
} from "@/components/ui/command";
import { useGroupedCategories, usePopularCategories } from "@/hooks/useBudgetCategories";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategorySelectContentProps {
    type?: 'income' | 'expense' | 'all';
    onAddCategory?: () => void;
    suggestedOnly?: boolean;
    suggestionLimit?: number;
    mode?: 'select' | 'command';
    selectedValue?: string;
    selectedValues?: string[];
    onSelect?: (value: string) => void;
    showAlwaysAsk?: boolean;
    hideSuggestions?: boolean;
    primaryCategory?: string | null;
    secondaryCategories?: string[];
    transactionAmount?: number;
}

export const CategorySelectContent = ({
    type = 'all',
    onAddCategory,
    suggestedOnly = false,
    suggestionLimit = 3,
    mode = 'select',
    selectedValue,
    selectedValues,
    onSelect,
    showAlwaysAsk = false,
    hideSuggestions = false,
    primaryCategory,
    secondaryCategories = [],
    transactionAmount
}: CategorySelectContentProps) => {
    const { income, feeders, expenses, slush, isLoading } = useGroupedCategories();
    const { data: popular = [] } = usePopularCategories(suggestionLimit);

    if (isLoading) {
        return mode === 'select'
            ? <SelectItem value="loading" disabled>Loading categories...</SelectItem>
            : <div className="p-2 text-center text-xs text-slate-400">Loading categories...</div>;
    }

    const renderGroup = (title: string, categories: any[], showSeparator = true) => {
        if (categories.length === 0) return null;

        if (mode === 'select') {
            return (
                <React.Fragment key={title}>
                    {showSeparator && <SelectSeparator className="my-1 opacity-50" />}
                    <SelectGroup>
                        <SelectLabel className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-semibold py-2 px-2 -ml-1">
                            {title}
                        </SelectLabel>
                        {categories.map(cat => (
                            <SelectItem
                                key={cat.id || cat.name}
                                value={cat.name}
                                className="text-xs py-1.5 focus:bg-slate-50 focus:text-slate-900 cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    {cat.color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />}
                                    <span className="font-medium whitespace-nowrap truncate">{cat.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </React.Fragment>
            );
        }

        return (
            <React.Fragment key={title}>
                {showSeparator && <CommandSeparator className="my-1 opacity-50" />}
                <CommandGroup heading={title} className="p-1">
                    {categories.map(cat => (
                        <CommandItem
                            key={cat.id || cat.name}
                            value={cat.name}
                            onSelect={() => onSelect?.(cat.name)}
                            className="text-xs py-1.5 cursor-pointer rounded-md hover:bg-slate-50"
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    {cat.color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />}
                                    <span className="font-medium whitespace-nowrap truncate">{cat.name}</span>
                                </div>
                                {(selectedValue === cat.name || selectedValues?.includes(cat.name)) && <Check className="h-3 w-3 opacity-100" />}
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
            </React.Fragment>
        );
    };

    // For popular items, we want to include both category and sub_category in the value if available
    const popularObjects = popular.map(p => ({
        id: `pop-${p.category}-${p.sub_category}`,
        name: p.sub_category ? `${p.category} > ${p.sub_category}` : p.category,
        value: p.sub_category ? `${p.category}:${p.sub_category}` : p.category
    }));

    const renderSuggestedGroup = (title: string, items: any[], showSeparator = true) => {
        if (items.length === 0) return null;

        if (mode === 'select') {
            return (
                <React.Fragment key={title}>
                    {showSeparator && <SelectSeparator className="my-1 opacity-50" />}
                    <SelectGroup>
                        <SelectLabel className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-semibold py-2 px-2 -ml-1">
                            {title}
                        </SelectLabel>
                        {items.map(item => (
                            <SelectItem
                                key={item.id}
                                value={item.value}
                                className="text-xs py-1.5 focus:bg-slate-50 focus:text-slate-900 cursor-pointer"
                            >
                                <span className="font-medium text-blue-700 whitespace-nowrap truncate">{item.name}</span>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </React.Fragment>
            );
        }

        return (
            <React.Fragment key={title}>
                {showSeparator && <CommandSeparator className="my-1 opacity-50" />}
                <CommandGroup heading={title} className="p-1">
                    {items.map(item => (
                        <CommandItem
                            key={item.id}
                            value={item.value}
                            onSelect={() => onSelect?.(item.value)}
                            className="text-xs py-1.5 cursor-pointer rounded-md bg-blue-50/30 hover:bg-blue-50"
                        >
                            <div className="flex items-center justify-between w-full px-1">
                                <span className="font-bold text-blue-700 whitespace-nowrap truncate">{item.name}</span>
                                {(selectedValue === item.value || selectedValues?.includes(item.value)) && <Check className="h-3 w-3 opacity-100 text-blue-700" />}
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
            </React.Fragment>
        );
    };

    const content = (
        <>
            {showAlwaysAsk && (
                <>
                    {mode === 'select' ? (
                        <SelectItem value="always-ask" className="text-slate-500 font-bold italic">
                            Always Ask
                        </SelectItem>
                    ) : (
                        <CommandItem
                            value="always-ask"
                            onSelect={() => onSelect?.('always-ask')}
                            className="text-slate-500 font-bold italic text-xs py-2"
                        >
                            Always Ask
                        </CommandItem>
                    )}
                    {mode === 'select' ? <SelectSeparator /> : <CommandSeparator />}
                </>
            )}
            {!hideSuggestions && popular.length > 0 && renderSuggestedGroup('Suggested Categories', popularObjects, false)}

            {/* Extract relevant category objects for Primary/Secondary */}
            {(() => {
                const allCatObjects = [...income, ...expenses, ...slush, ...feeders.flatMap(f => f.categories)];
                const pCat = primaryCategory && primaryCategory !== 'always-ask' ? allCatObjects.find(c => c.name === primaryCategory) : null;
                const sCats = secondaryCategories?.length ? allCatObjects.filter(c => secondaryCategories.includes(c.name)) : [];

                return (
                    <>
                        {pCat && renderGroup('Primary Category', [pCat], !hideSuggestions && popular.length > 0)}
                        {sCats.length > 0 && renderGroup('Secondary Categories', sCats, (!hideSuggestions && popular.length > 0) || !!pCat)}
                    </>
                );
            })()}

            {!suggestedOnly && (
                <>
                    {/* If positive amount, Income goes before Expenses/Feeders */}
                    {transactionAmount !== undefined && transactionAmount > 0 && renderGroup('Income', income, true)}

                    {/* Show Feeder Budgets */}
                    {feeders.map((f, idx) => {
                        return renderGroup(`Feeder: ${f.name}`, f.categories, true);
                    })}

                    {/* Show standard Expenses */}
                    {renderGroup('Expenses', expenses, true)}

                    {/* Show Slush Fund */}
                    {renderGroup('Slush Fund 🍧', slush, true)}

                    {/* If not strictly positive amount, Income goes at the bottom (or if transactionAmount is undefined, put it here) */}
                    {(transactionAmount === undefined || transactionAmount <= 0) && renderGroup('Income', income, true)}
                </>
            )}

            {onAddCategory && (
                <>
                    {mode === 'select' ? <SelectSeparator /> : <CommandSeparator />}
                    {mode === 'select' ? (
                        <SelectItem value="add-new" className="text-blue-600 font-bold">
                            + Add New Category
                        </SelectItem>
                    ) : (
                        <CommandItem
                            value="add-new"
                            onSelect={() => onAddCategory()}
                            className="text-blue-600 font-bold text-xs py-2"
                        >
                            + Add New Category
                        </CommandItem>
                    )}
                </>
            )}
        </>
    );

    return content;
};
