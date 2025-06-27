
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
}

const SortableHeader = ({ field, children, sortBy, sortOrder, onSort }: SortableHeaderProps) => (
  <th className="text-left py-3 px-2 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => onSort(field)}>
    <div className="flex items-center space-x-1">
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
}

export const TransactionsTableHeader = ({ 
  sortBy, 
  sortOrder, 
  onSort, 
  onFilter, 
  onClearFilter 
}: TransactionsTableHeaderProps) => {
  return (
    <thead>
      <tr className="border-b border-gray-200">
        <SortableHeader field="date" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Date</span>
            <FilterableHeader field="date" onFilter={onFilter} onClearFilter={onClearFilter} />
          </div>
        </SortableHeader>
        <SortableHeader field="description" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          <div className="flex items-center space-x-1">
            <span>Description</span>
            <FilterableHeader field="description" onFilter={onFilter} onClearFilter={onClearFilter} />
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
        <SortableHeader field="planned" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
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
      </tr>
    </thead>
  );
};
