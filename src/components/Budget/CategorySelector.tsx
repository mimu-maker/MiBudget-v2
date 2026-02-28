import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CategorySelectContent } from "./CategorySelectContent";

interface CategorySelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    type?: 'income' | 'expense' | 'all';
    placeholder?: string;
    className?: string;
    onAddCategory?: () => void;
    suggestionLimit?: number;
    disabled?: boolean;
    showAlwaysAsk?: boolean;
    hideSuggestions?: boolean;
    primaryCategory?: string | null;
    secondaryCategories?: string[];
    transactionAmount?: number;
}

export const CategorySelector = ({
    value,
    onValueChange,
    type = 'all',
    placeholder = "Select category...",
    className,
    onAddCategory,
    suggestionLimit = 3,
    disabled = false,
    showAlwaysAsk = false,
    hideSuggestions = false,
    primaryCategory,
    secondaryCategories,
    transactionAmount
}: CategorySelectorProps) => {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between bg-white text-xs font-medium h-9 px-3 border-slate-200 hover:border-slate-300 transition-all",
                        className
                    )}
                >
                    <span className="truncate">
                        {(!value || value === 'always-ask') && showAlwaysAsk ? "Always Ask" : (value || placeholder)}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
                <Command className="border-none">
                    <CommandInput placeholder="Search categories..." className="h-9 px-3 text-xs" autoFocus />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty className="p-4 text-center text-xs text-slate-400 italic">
                            No categories found.
                        </CommandEmpty>
                        <CategorySelectContent
                            type={type}
                            mode="command"
                            selectedValue={value}
                            onSelect={(v) => {
                                onValueChange(v === 'always-ask' ? '' : v);
                                setOpen(false);
                            }}
                            onAddCategory={onAddCategory}
                            suggestionLimit={suggestionLimit}
                            showAlwaysAsk={showAlwaysAsk}
                            hideSuggestions={hideSuggestions}
                            primaryCategory={primaryCategory}
                            secondaryCategories={secondaryCategories}
                            transactionAmount={transactionAmount}
                        />
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
