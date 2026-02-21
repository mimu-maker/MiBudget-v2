import React, { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SourceNameSelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    hideAddNew?: boolean;
    disabled?: boolean;
}

export const SourceNameSelector: React.FC<SourceNameSelectorProps> = ({ value, onChange, className, hideAddNew, disabled }) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    const { data: rankedSources = [] } = useQuery({
        queryKey: ['existing-source-names-ranked'],
        queryFn: async () => {
            // Fetch rules and common clean sources from transactions
            const [sourceRes, merchantRes, txRes] = await Promise.allSettled([
                (supabase as any).from('source_rules').select('*'),
                (supabase as any).from('merchant_rules').select('*'),
                (supabase as any).from('transactions')
                    .select('clean_source')
                    .not('clean_source', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(500)
            ]);

            const rules: any[] = [];
            const sourceMap = new Map<string, { name: string, score: number }>();

            // Process source_rules (New)
            if (sourceRes.status === 'fulfilled' && sourceRes.value.data) {
                sourceRes.value.data.forEach((r: any) => {
                    const name = r.clean_source_name || r.source_name;
                    if (name) {
                        let score = 50;
                        if (r.auto_recurring === 'N/A') score += 20;
                        if (!sourceMap.has(name) || score > sourceMap.get(name)!.score) {
                            sourceMap.set(name, { name, score });
                        }
                    }
                });
            }

            // Process merchant_rules (Legacy)
            if (merchantRes.status === 'fulfilled' && merchantRes.value.data) {
                merchantRes.value.data.forEach((r: any) => {
                    const name = r.clean_merchant_name || r.merchant || r.merchant_name;
                    if (name) {
                        let score = 40; // Lower priority for legacy
                        if (r.auto_recurring === 'N/A') score += 10;
                        if (!sourceMap.has(name) || score > sourceMap.get(name)!.score) {
                            sourceMap.set(name, { name, score });
                        }
                    }
                });
            }

            // Process Transaction clean sources (Real-word data)
            if (txRes.status === 'fulfilled' && txRes.value.data) {
                txRes.value.data.forEach((tx: any) => {
                    const name = tx.clean_source;
                    if (name) {
                        const existing = sourceMap.get(name);
                        sourceMap.set(name, { name, score: (existing?.score || 10) + 1 }); // Boost score by usage
                    }
                });
            }

            const sorted = Array.from(sourceMap.values())
                .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

            return sorted;
        }
    });

    const displayedSources = searchValue
        ? rankedSources
        : rankedSources.slice(0, 10);

    const hasMore = !searchValue && rankedSources.length > 10;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-white font-bold text-blue-600 h-10 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all", className)}
                >
                    <span className="truncate">
                        {value || "Select or search resolved source..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-blue-100" align="start">
                <Command>
                    <CommandInput
                        placeholder="Search existing sources..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                        className="h-10"
                    />
                    <CommandList className="max-h-[300px]">
                        <CommandEmpty className="p-0">
                            {searchValue && !hideAddNew && (
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
                            {(hideAddNew || !searchValue) && (
                                <div className="p-4 text-center text-xs text-slate-400 italic">
                                    Type to search...
                                </div>
                            )}
                        </CommandEmpty>

                        {!hideAddNew && (
                            <CommandGroup className="p-1 border-b border-slate-50">
                                {searchValue && !rankedSources.some(m => m.name.toLowerCase() === searchValue.toLowerCase()) ? (
                                    <CommandItem
                                        value={searchValue}
                                        onSelect={() => {
                                            onChange(searchValue);
                                            setOpen(false);
                                            setSearchValue("");
                                        }}
                                        className="rounded-md cursor-pointer bg-blue-600 text-white font-black hover:bg-blue-700 transition-colors my-1"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add "{searchValue}"
                                    </CommandItem>
                                ) : (
                                    <CommandItem
                                        value="USER_INTENT_ADD_NEW"
                                        onSelect={() => {
                                            onChange(""); // Empty string triggers new source flow with blank name
                                            setOpen(false);
                                            setSearchValue("");
                                        }}
                                        className="rounded-md cursor-pointer bg-blue-50 text-blue-700 font-bold hover:bg-blue-600 hover:text-white transition-colors my-1"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add New Source Name
                                    </CommandItem>
                                )}
                            </CommandGroup>
                        )}

                        {displayedSources.length > 0 && (
                            <CommandGroup heading={searchValue ? "Matching Sources" : "Top Suggestions"} className="p-1">
                                {displayedSources.map((source) => (
                                    <CommandItem
                                        key={source.name}
                                        value={source.name}
                                        onSelect={(currentValue) => {
                                            onChange(currentValue);
                                            setOpen(false);
                                            setSearchValue("");
                                        }}
                                        className="rounded-md cursor-pointer hover:bg-blue-50 aria-selected:bg-blue-600 aria-selected:text-white group"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-medium">{source.name}</span>
                                            <Check
                                                className={cn(
                                                    "h-4 w-4 opacity-0 group-aria-selected:opacity-100",
                                                    value === source.name && "opacity-100"
                                                )}
                                            />
                                        </div>
                                    </CommandItem>
                                ))}
                                {hasMore && (
                                    <div className="px-2 py-3 text-center border-t border-slate-50">
                                        <p className="text-[10px] text-slate-400 italic">
                                            Showing top 10. Type to search {rankedSources.length - 10} more...
                                        </p>
                                    </div>
                                )}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
