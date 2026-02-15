
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Check, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Transaction } from './hooks/useTransactionTable';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { CategorySelectContent } from '../Budget/CategorySelectContent';

interface SortableHeaderProps {
  field: keyof Transaction;
  children: React.ReactNode;
  sortBy: keyof Transaction;
  sortOrder: 'asc' | 'desc';
  onSort: (field: keyof Transaction) => void;
  className?: string;
}

const SortableHeader = ({ field, children, sortBy, sortOrder, onSort, className }: SortableHeaderProps) => (
  <th
    className={cn("text-left py-3 px-2 font-semibold text-muted-foreground cursor-pointer hover:bg-accent/50 transition-colors", className)}
    onClick={() => onSort(field)}
  >
    <div className={`flex items-center space-x-1 ${className?.includes('text-center') ? 'justify-center' : ''}`}>
      <span>{children}</span>
      {sortBy === field && (
        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
      )}
    </div>
  </th>
);

interface FilterableHeaderProps {
  field: string;
  onFilter: (field: string, value: any) => void;
  onClearFilter: (field: string) => void;
  currentFilter?: any;
  options?: string[];
  resolutionFilter?: string;
  statusOptions?: string[];
}

const FilterableHeader = ({ field, onFilter, onClearFilter, currentFilter, options = [], resolutionFilter, statusOptions = [] }: FilterableHeaderProps) => {
  // Helper for multi-select toggle
  const toggleOption = (option: string) => {
    const current = Array.isArray(currentFilter) ? currentFilter : [];
    const newOptions = current.includes(option)
      ? current.filter((i: string) => i !== option)
      : [...current, option];

    if (newOptions.length === 0) {
      onClearFilter(field);
    } else {
      onFilter(field, newOptions);
    }
  };

  const isSelected = (option: string) => Array.isArray(currentFilter) && currentFilter.includes(option);

  // Helper for boolean filter
  const handleBooleanFilter = (val: string) => {
    if (val === 'all') onClearFilter(field);
    else onFilter(field, val); // 'true' or 'false'
  };

  const activeBoolean = currentFilter === 'true' ? 'true' : currentFilter === 'false' ? 'false' : 'all';

  // Date Range Helper
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range) {
      onClearFilter(field);
      return;
    }
    onFilter(field, { type: 'range', value: range });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`h-auto p-1 ${currentFilter ? 'text-primary' : ''}`}>
          <Filter className={`w-3 h-3 ${currentFilter ? 'fill-current' : ''}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-2 min-w-[220px]" align="start">
        {field === 'amount' ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Select
                value={currentFilter?.operator || '='}
                onValueChange={(val) => onFilter(field, { ...currentFilter, operator: val, type: 'number', value: currentFilter?.value || '' })}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="=">=</SelectItem>
                  <SelectItem value="!=">!=</SelectItem>
                  <SelectItem value=">">&gt;</SelectItem>
                  <SelectItem value=">=">&gt;=</SelectItem>
                  <SelectItem value="<">&lt;</SelectItem>
                  <SelectItem value="<=">&lt;=</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Amount"
                type="number"
                value={currentFilter?.value || ''}
                onChange={(e) => onFilter(field, { ...currentFilter, operator: currentFilter?.operator || '=', type: 'number', value: e.target.value })}
                className="w-32"
                autoFocus
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => onClearFilter(field)} className="w-full justify-start text-muted-foreground h-8 px-2">
              Clear Filter
            </Button>
          </div>
        ) : field === 'date' ? (
          <div className="flex flex-col gap-2">
            <DropdownMenuLabel>Presets</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onFilter(field, { type: 'month', value: new Date().getMonth() + 1 })}>
              This Month
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilter(field, { type: 'week', value: Math.ceil(new Date().getDate() / 7) })}>
              This Week
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Years</DropdownMenuLabel>
            <div className="grid grid-cols-2 gap-1 px-2">
              {[2024, 2025, 2026].map(year => (
                <Button
                  key={year}
                  variant={currentFilter?.type === 'year' && currentFilter.value === year ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onFilter(field, { type: 'year', value: year })}
                >
                  {year}
                </Button>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Custom Range</DropdownMenuLabel>
            <div className="px-2 pb-2">
              <DatePickerWithRange
                date={currentFilter?.type === 'range' ? currentFilter.value : undefined}
                setDate={handleDateRangeChange}
              />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onClearFilter(field)}>
              Clear Filter
            </DropdownMenuItem>
          </div>
        ) : field === 'excluded' || field === 'planned' ? (
          <div className="flex flex-col gap-3 p-2">
            <RadioGroup value={activeBoolean} onValueChange={handleBooleanFilter}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id={`r-all-${field}`} />
                <Label htmlFor={`r-all-${field}`}>All</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`r-true-${field}`} />
                <Label htmlFor={`r-true-${field}`}>{field === 'excluded' ? 'Excluded Only' : 'Planned Only'}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`r-false-${field}`} />
                <Label htmlFor={`r-false-${field}`}>{field === 'excluded' ? 'Included Only' : 'Unplanned Only'}</Label>
              </div>
            </RadioGroup>
          </div>
        ) : field === 'status' || field === 'category' || field === 'sub_category' || field === 'recurring' || field === 'account' ? (
          <div className="flex flex-col gap-2">
            <Command className="h-[250px] border rounded-md" filter={(value, search) => {
              if (search === "") return 1;
              if (value.toLowerCase().includes(search.toLowerCase())) return 1;
              return 0;
            }}>
              <CommandInput placeholder={`Search ${field}...`} autoFocus className="h-8 text-xs" />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {field === 'category' ? (
                  <CategorySelectContent
                    mode="command"
                    onSelect={(val) => toggleOption(val)}
                    selectedValues={Array.isArray(currentFilter) ? currentFilter : []}
                    hideSuggestions={true}
                  />
                ) : (
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option}
                        value={option}
                        onSelect={() => toggleOption(option)}
                        className="text-xs"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected(option)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className={cn("h-4 w-4")} />
                        </div>
                        <span>{option || '(Empty)'}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
            <Button variant="ghost" size="sm" onClick={() => onClearFilter(field)} className="w-full justify-start text-muted-foreground h-8 px-2 text-xs">
              Clear Filter
            </Button>
          </div>
        ) : field === 'source' ? (
          <div className="flex flex-col gap-2">
            <div className="px-1 mb-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground/70 mb-1.5 block">View Presets</Label>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant={!resolutionFilter ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 text-[10px] font-bold"
                  onClick={() => onClearFilter('resolution')}
                >
                  All
                </Button>
                <Button
                  variant={resolutionFilter === 'unresolved' ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 text-[10px] font-bold px-0.5"
                  onClick={() => onFilter('resolution', 'unresolved')}
                >
                  Unresolved
                </Button>
                <Button
                  variant={resolutionFilter === 'resolved' ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 text-[10px] font-bold"
                  onClick={() => onFilter('resolution', 'resolved')}
                >
                  Resolved
                </Button>
              </div>
            </div>
            <DropdownMenuSeparator className="-mx-2" />
            <div className="px-1 mt-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground/70 mb-1.5 block">Filter by Name</Label>
              <Input
                placeholder="Search matching..."
                value={typeof currentFilter === 'string' ? currentFilter : ''}
                onChange={(e) => onFilter(field, e.target.value)}
                className="h-8 text-xs mb-2"
                autoFocus
              />
              {typeof currentFilter === 'string' && currentFilter.length > 0 && (
                <ScrollArea className="h-[120px] -mx-1 px-1">
                  <div className="flex flex-col gap-0.5">
                    {options
                      .filter(opt => opt.toLowerCase().includes(currentFilter.toLowerCase()))
                      .map(opt => (
                        <Button
                          key={opt}
                          variant="ghost"
                          size="sm"
                          className="h-7 justify-start text-[11px] font-normal px-2 hover:bg-muted"
                          onClick={() => onFilter(field, opt)}
                        >
                          {opt}
                        </Button>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => onClearFilter(field)} className="w-full justify-start text-muted-foreground h-8 px-2 text-[10px]">
              Clear Source Filter
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              placeholder={`Filter ${field}...`}
              value={typeof currentFilter === 'string' ? currentFilter : ''}
              onChange={(e) => onFilter(field, e.target.value)}
              className="w-48"
              autoFocus
            />
            <Button variant="ghost" size="sm" onClick={() => onClearFilter(field)} className="w-full justify-start text-muted-foreground h-8 px-2">
              Clear Filter
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface TransactionsTableHeaderProps {
  sortBy: keyof Transaction;
  sortOrder: 'asc' | 'desc';
  onSort: (field: keyof Transaction) => void;
  onFilter: (field: string, value: any) => void;
  onClearFilter: (field: string) => void;
  onSelectAll: (checked: boolean) => void;
  isAllSelected: boolean;
  filters: Record<string, any>;
  filterOptions: {
    categories: string[];
    subCategories: string[];
    statuses: string[];
    recurring: string[];
    sources: string[];
  };
}

export const TransactionsTableHeader = ({
  sortBy,
  sortOrder,
  onSort,
  onFilter,
  onClearFilter,
  onSelectAll,
  isAllSelected,
  filters,
  filterOptions
}: TransactionsTableHeaderProps) => {
  return (
    <thead>
      <tr className="border-b border-border">
        <th className="py-3 px-2 text-left">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="rounded border-input bg-background text-primary focus:ring-ring"
          />
        </th>
        <SortableHeader field="date" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="whitespace-nowrap">
          <div className="flex items-center space-x-1">
            <span>Date</span>
            <FilterableHeader field="date" onFilter={onFilter} onClearFilter={onClearFilter} currentFilter={filters.date} />
          </div>
        </SortableHeader>
        <SortableHeader field="source" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Transaction Source</span>
            <FilterableHeader
              field="source"
              onFilter={onFilter}
              onClearFilter={onClearFilter}
              currentFilter={filters.source}
              options={filterOptions.sources}
              resolutionFilter={filters.resolution}
              statusOptions={filterOptions.statuses}
            />
          </div>
        </SortableHeader>
        <SortableHeader field="amount" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="whitespace-nowrap text-right">
          <div className="flex items-center justify-end space-x-1">
            <span>Amount</span>
            <FilterableHeader field="amount" onFilter={onFilter} onClearFilter={onClearFilter} currentFilter={filters.amount} />
          </div>
        </SortableHeader>

        <SortableHeader field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="px-1 w-[1%] whitespace-nowrap">
          <div className="flex items-center space-x-1">
            <span>Status</span>
            <FilterableHeader field="status" onFilter={onFilter} onClearFilter={onClearFilter} currentFilter={filters.status} options={filterOptions.statuses} />
          </div>
        </SortableHeader>
        <SortableHeader field="category" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Category</span>
            <FilterableHeader field="category" onFilter={onFilter} onClearFilter={onClearFilter} currentFilter={filters.category} options={filterOptions.categories} />
          </div>
        </SortableHeader>
        <SortableHeader field="sub_category" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Sub-category</span>
            <FilterableHeader field="sub_category" onFilter={onFilter} onClearFilter={onClearFilter} currentFilter={filters.sub_category} options={filterOptions.subCategories} />
          </div>
        </SortableHeader>
        <SortableHeader field="planned" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="text-center">
          <div className="flex items-center space-x-1">
            <span>Unplanned</span>
            <FilterableHeader field="planned" onFilter={onFilter} onClearFilter={onClearFilter} currentFilter={filters.planned} />
          </div>
        </SortableHeader>
        <SortableHeader field="excluded" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="text-center">
          <div className="flex items-center space-x-1">
            <span>Exclude</span>
            <FilterableHeader field="excluded" onFilter={onFilter} onClearFilter={onClearFilter} currentFilter={filters.excluded} />
          </div>
        </SortableHeader>
        <th className="py-3 px-2 text-center text-muted-foreground font-semibold">
          Actions
        </th>
      </tr>
    </thead>
  );
};
