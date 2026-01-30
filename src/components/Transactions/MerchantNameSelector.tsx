import React, { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MerchantNameSelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export const MerchantNameSelector: React.FC<MerchantNameSelectorProps> = ({ value, onChange, className }) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    const { data: existingMerchants = [] } = useQuery({
        queryKey: ['existing-merchant-names'],
        queryFn: async () => {
            const { data } = await supabase
                .from('merchant_rules')
                .select('clean_merchant_name')
                .order('clean_merchant_name');

            // Get unique names and filter out empty/null
            const names = Array.from(new Set((data || [])
                .map(r => r.clean_merchant_name)
                .filter(Boolean)
            ));
            return names;
        }
    });

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-white font-bold text-blue-600 h-10 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all", className)}
                >
                    <span className="truncate">
                        {value || "Select or search display name..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-blue-100" align="start">
                <Command>
                    <CommandInput
                        placeholder="Search existing merchants..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                        className="h-10"
                    />
                    <CommandList className="max-h-[300px]">
                        <CommandEmpty className="p-0">
                            {searchValue && (
                                <div className="p-2 border-t border-slate-50 bg-slate-50/50">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-blue-600 font-black hover:bg-blue-600 hover:text-white transition-colors gap-2 h-9"
                                        onClick={() => {
                                            onChange(searchValue);
                                            setOpen(false);
                                            setSearchValue("");
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add "{searchValue}"
                                    </Button>
                                </div>
                            )}
                            {!searchValue && (
                                <div className="p-4 text-center text-xs text-slate-400 italic">
                                    Type to search...
                                </div>
                            )}
                        </CommandEmpty>

                        <CommandGroup heading="Actions" className="p-1 border-b border-slate-50">
                            <CommandItem
                                value="USER_INTENT_ADD_NEW"
                                onSelect={() => {
                                    onChange(""); // Empty string triggers new merchant flow with blank name
                                    setOpen(false);
                                    setSearchValue("");
                                }}
                                className="rounded-md cursor-pointer bg-blue-50 text-blue-700 font-bold hover:bg-blue-600 hover:text-white transition-colors my-1"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Merchant
                            </CommandItem>
                        </CommandGroup>

                        {existingMerchants.length > 0 && (
                            <CommandGroup heading="Existing Display Names" className="p-1">
                                {existingMerchants.map((merchant) => (
                                    <CommandItem
                                        key={merchant}
                                        value={merchant}
                                        onSelect={(currentValue) => {
                                            onChange(currentValue);
                                            setOpen(false);
                                            setSearchValue("");
                                        }}
                                        className="rounded-md cursor-pointer hover:bg-blue-50 aria-selected:bg-blue-600 aria-selected:text-white group"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-medium">{merchant}</span>
                                            <Check
                                                className={cn(
                                                    "h-4 w-4 opacity-0 group-aria-selected:opacity-100",
                                                    value === merchant && "opacity-100"
                                                )}
                                            />
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}

                        {searchValue && !existingMerchants.some(m => m.toLowerCase() === searchValue.toLowerCase()) && (
                            <CommandGroup heading="New Name" className="p-1 border-t border-slate-50">
                                <CommandItem
                                    value={searchValue}
                                    onSelect={() => {
                                        onChange(searchValue);
                                        setOpen(false);
                                        setSearchValue("");
                                    }}
                                    className="rounded-md cursor-pointer bg-blue-50 text-blue-700 font-bold hover:bg-blue-600 hover:text-white transition-colors"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Merchant Display Name: "{searchValue}"
                                </CommandItem>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
