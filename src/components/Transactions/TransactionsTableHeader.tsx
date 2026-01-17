
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Transaction } from './hooks/useTransactionTable';

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
    className={`${className || 'text-left'} py-3 px-2 font-semibold text-muted-foreground cursor-pointer hover:bg-accent/50 transition-colors`}
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
}

const FilterableHeader = ({ field, onFilter, onClearFilter }: FilterableHeaderProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="h-auto p-1">
        <Filter className="w-3 h-3" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {field === 'date' ? (
        <>
          <DropdownMenuItem onClick={() => onFilter(field, { type: 'month', value: new Date().getMonth() + 1 })}>
            This Month
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFilter(field, { type: 'week', value: Math.ceil(new Date().getDate() / 7) })}>
            This Week
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFilter(field, { type: 'date', value: new Date().toISOString().split('T')[0] })}>
            Today
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onClearFilter(field)}>
            Clear Filter
          </DropdownMenuItem>
        </>
      ) : field === 'excluded' || field === 'planned' ? (
        <>
          <DropdownMenuItem onClick={() => onFilter(field, 'true')}>
            Yes / True
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFilter(field, 'false')}>
            No / False
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onClearFilter(field)}>
            Clear Filter
          </DropdownMenuItem>
        </>
      ) : (
        <>
          <div className="p-2">
            <Input
              placeholder={`Filter ${field}...`}
              onChange={(e) => onFilter(field, e.target.value)}
              className="w-40"
            />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onClearFilter(field)}>
            Clear Filter
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);

interface TransactionsTableHeaderProps {
  sortBy: keyof Transaction;
  sortOrder: 'asc' | 'desc';
  onSort: (field: keyof Transaction) => void;
  onFilter: (field: string, value: any) => void;
  onClearFilter: (field: string) => void;
  onSelectAll: (checked: boolean) => void;
  isAllSelected: boolean;
}

export const TransactionsTableHeader = ({
  sortBy,
  sortOrder,
  onSort,
  onFilter,
  onClearFilter,
  onSelectAll,
  isAllSelected
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
        <SortableHeader field="date" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Date</span>
            <FilterableHeader field="date" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="merchant" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Merchant</span>
            <FilterableHeader field="merchant" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="amount" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Amount</span>
            <FilterableHeader field="amount" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="account" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Account</span>
            <FilterableHeader field="account" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Status</span>
            <FilterableHeader field="status" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="budget" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Budget</span>
            <FilterableHeader field="budget" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="category" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Category</span>
            <FilterableHeader field="category" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="subCategory" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Sub-category</span>
            <FilterableHeader field="subCategory" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="planned" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="text-center">
          <div className="flex items-center space-x-1">
            <span>Planned</span>
            <FilterableHeader field="planned" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="recurring" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Recurring</span>
            <FilterableHeader field="recurring" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="excluded" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="text-center">
          <div className="flex items-center space-x-1">
            <span>Exclude</span>
            <FilterableHeader field="excluded" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <th className="py-3 px-2 text-center text-muted-foreground font-semibold">
          Actions
        </th>
      </tr>
    </thead>
  );
};
