import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface SubCategorySelectorProps {
    value: string | null;
    currentCategory: string | null;
    displaySubCategories: Record<string, string[]>;
    onValueChange: (category: string, subCategory: string) => void;
    onOpenChange?: (open: boolean) => void;
    onAddSubCategory?: () => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

export const SubCategorySelector = ({
    value,
    currentCategory,
    displaySubCategories,
    onValueChange,
    onOpenChange,
    onAddSubCategory,
    disabled = false,
    placeholder = "Select subcategory...",
    className
}: SubCategorySelectorProps) => {
    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        onOpenChange?.(newOpen);
    };

    const categories = Object.keys(displaySubCategories || {}).sort((a, b) => a.localeCompare(b));

    // Sort logic to put currentCategory at top
    let sortedCategories = categories;
    if (currentCategory && categories.includes(currentCategory)) {
        sortedCategories = [
            currentCategory,
            ...categories.filter(c => c !== currentCategory)
        ];
    }

    // Determine display value
    const displayValue = value ? value : placeholder;

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
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
                        {displayValue}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0" align="start">
                <Command value={searchValue} onValueChange={setSearchValue}>
                    <CommandInput
                        placeholder={`Search ${placeholder.toLowerCase()}...`}
                        className="h-9 px-3 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Tab' && !searchValue) {
                                setOpen(false);
                                onOpenChange?.(false);
                            }
                        }}
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty className="p-4 text-center text-xs text-slate-400 italic">
                            No subcategories found.
                        </CommandEmpty>
                        {sortedCategories.map((category, idx) => {
                            const subs = displaySubCategories[category] || [];
                            if (subs.length === 0) return null;

                            return (
                                <React.Fragment key={category}>
                                    {idx > 0 && <CommandSeparator className="my-1 opacity-50" />}
                                    <CommandGroup heading={category}>
                                        {subs.map((sub) => (
                                            <CommandItem
                                                key={`${category}-${sub}`}
                                                value={`${category} ${sub}`}
                                                onSelect={() => {
                                                    onValueChange(category, sub);
                                                    setOpen(false);
                                                    onOpenChange?.(false);
                                                }}
                                                className="cursor-pointer text-xs py-1.5"
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{sub}</span>
                                                    <Check
                                                        className={cn(
                                                            "ml-2 h-3 w-3",
                                                            value === sub && currentCategory === category ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </React.Fragment>
                            );
                        })}

                        {onAddSubCategory && (
                            <>
                                <CommandSeparator className="my-1 opacity-50" />
                                <CommandGroup>
                                    <CommandItem
                                        value="add-new"
                                        onSelect={() => {
                                            if (onAddSubCategory) {
                                                onAddSubCategory();
                                            }
                                            setOpen(false);
                                            onOpenChange?.(false);
                                        }}
                                        className="text-blue-600 font-bold text-xs py-2 cursor-pointer"
                                    >
                                        + Add New Sub-category
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
