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
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface SmartSelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    onOpenChange?: (open: boolean) => void;
    options: (string | { label: string; value: string })[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    emptyMessage?: string;
}

export const SmartSelector = ({
    value,
    onValueChange,
    onOpenChange,
    options,
    placeholder = "Select...",
    className,
    disabled = false,
    emptyMessage = "No results found."
}: SmartSelectorProps) => {
    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        onOpenChange?.(newOpen);
    };

    const formattedOptions = options.map(opt =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    const selectedOption = formattedOptions.find(opt => opt.value === value);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between bg-white text-sm font-medium h-10 px-3 border-slate-200 hover:border-slate-300 transition-all",
                        className
                    )}
                    onFocus={() => setOpen(true)}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command value={searchValue} onValueChange={setSearchValue}>
                    <CommandInput
                        placeholder={`Search ${placeholder.toLowerCase()}...`}
                        className="h-9 px-3 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Tab' && !searchValue) {
                                setOpen(false);
                            }
                        }}
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty className="p-4 text-center text-sm text-slate-400 italic">
                            {emptyMessage}
                        </CommandEmpty>
                        <CommandGroup>
                            {formattedOptions.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
