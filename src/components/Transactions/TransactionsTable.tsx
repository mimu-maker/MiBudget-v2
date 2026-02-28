import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, ChevronDown, Clock, Zap, History, Calculator, FilterX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { UnifiedAddTransactionsDialog } from './UnifiedAddTransactionsDialog';
import { TransactionSplitModal } from './TransactionSplitModal';
import { TransactionEditDrawer } from './TransactionEditDrawer';

import { TransactionsTableHeader } from './TransactionsTableHeader';
import { TransactionsTableRow } from './TransactionsTableRow';
import { useTransactionTable, Transaction } from './hooks/useTransactionTable';
import { BulkActionBar } from './BulkActionBar';
import { BulkEditDialog } from './BulkEditDialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useSettings, APP_STATUSES } from '@/hooks/useSettings';
import { useGroupedCategories } from '@/hooks/useBudgetCategories'; // Import the hook
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';

export const TransactionsTable = () => {
  const {
    transactions,
    selectedIds,
    sortBy,
    sortOrder,
    filters,
    editingCell,
    setEditingCell,
    handleSort,
    handleFilter,
    clearFilter,
    handleCellEdit,
    handleBulkCellEdit,
    handleImport,
    handleAddTransaction,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkUpdate,
    bulkDelete,
    deleteTransaction,
    isLoading,
    isError,
    isBulkUpdating,
    isBulkDeleting,
    projections,
    emergencyClearAll,
    knownSources,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    totalCount,
    filteredCount,
    filteredSum,
    hasActiveFilters,
    isSaving
  } = useTransactionTable();

  const { settings } = useSettings();

  // Use the hook to get grouped categories
  const { income, feeders, slush, expenses, isLoading: isCategoriesLoading } = useGroupedCategories();

  const filterOptions = useMemo(() => {
    const allSubCategories = Object.values(settings.subCategories).flat();
    const uniqueSubCategories = Array.from(new Set(allSubCategories));
    const uniqueRecurring = Array.from(new Set(transactions.map(t => t.recurring).filter(Boolean)));

    // Construct the custom sorted list: Income -> Feeders -> Slush -> Expenses
    // We use the names from the hook's result
    let sortedCategories: string[] = [];

    if (!isCategoriesLoading && (income.length > 0 || expenses.length > 0)) {
      const incomeNames = income.map(c => c.name);
      // Flatten all feeder categories
      const feederNames = feeders.flatMap(f => f.categories.map(c => c.name));
      const slushNames = slush.map(c => c.name);
      const expenseNames = expenses.map(c => c.name);

      sortedCategories = [
        ...incomeNames,
        ...feederNames,
        ...expenseNames,
        ...slushNames
      ];

      // Safety check: if for some reason the database list is empty, fall back to settings
      if (sortedCategories.length === 0) {
        sortedCategories = settings.categories;
      }
    } else {
      // Fallback to settings if loading or no data
      sortedCategories = settings.categories;
    }

    // Filter out duplicates just in case
    sortedCategories = Array.from(new Set(sortedCategories));

    return {
      categories: sortedCategories,
      subCategories: uniqueSubCategories,
      statuses: APP_STATUSES,
      recurring: uniqueRecurring,
      sources: Array.from(knownSources)
    };
  }, [settings, transactions, income, feeders, slush, expenses, isCategoriesLoading, knownSources]);

  const [addTransactionsOpen, setAddTransactionsOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [transactionToSplit, setTransactionToSplit] = useState<Transaction | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const feederCategoryNames = useMemo(() =>
    feeders.flatMap(f => f.categories.map(c => c.name.toLowerCase())),
    [feeders]
  );

  const filteredAndSortedTransactions = useMemo(() => {
    return transactions;
  }, [transactions]);

  const handleStartEdit = useCallback((id: string, field: keyof Transaction) => {
    setEditingCell({ id, field });
  }, [setEditingCell]);

  const handleStopEdit = useCallback(() => {
    setEditingCell(null);
  }, [setEditingCell]);

  const handleDelete = useCallback((id: string) => {
    setTransactionToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const handleSplit = useCallback((t: Transaction) => {
    setTransactionToSplit(t);
    setSplitModalOpen(true);
  }, []);

  const handleRowClick = useCallback((t: Transaction) => {
    setTransactionToEdit(t);
  }, []);

  const handleSingleDelete = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete); // Call the delete function from useTransactionTable
      setTransactionToDelete(null);
    }
  };

  useEffect(() => {
    const handleOpenAddTransaction = () => setAddTransactionsOpen(true);
    window.addEventListener('open-add-transaction', handleOpenAddTransaction);
    return () => window.removeEventListener('open-add-transaction', handleOpenAddTransaction);
  }, []);

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredAndSortedTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45, // Estimate row height
    overscan: 10,
    onChange: (instance) => {
      const lastItem = instance.getVirtualItems().at(-1);
      if (!lastItem) return;

      if (
        lastItem.index >= filteredAndSortedTransactions.length - 1 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    }
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
    : 0;

  return (
    <div className="px-6 pb-6 pt-4 h-full flex flex-col box-border">
      {isLoading && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg animate-pulse flex items-center shrink-0">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
          <span className="text-blue-700 text-sm font-medium">Syncing with cloud database... This may take a moment for large datasets.</span>
        </div>
      )}

      {isError && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-between shrink-0">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-amber-500 rounded-full mr-3" />
            <span className="text-amber-700 text-sm font-medium">Running in Local Mode. Cloud sync is currently unavailable.</span>
          </div>
        </div>
      )}

      <Card className="flex flex-col flex-1 min-h-0 border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="py-6 px-6 shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50 border-b space-y-0">
          <CardTitle className="text-xl font-bold text-slate-800">
            Transactions ({hasActiveFilters ? `${filteredCount} of ${totalCount}` : totalCount})
            {hasActiveFilters && (
              <span className="ml-2 text-slate-500 font-medium text-base">
                → {formatCurrency(filteredSum, settings.currency)}
              </span>
            )}
          </CardTitle>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex bg-white border border-slate-200 p-0.5 rounded-lg">
              {[
                { id: 'date', label: 'DATE', defaultOrder: 'desc' },
                { id: 'amount', label: 'AMOUNT', defaultOrder: 'desc' },
                { id: 'source', label: 'A-Z', defaultOrder: 'asc' }
              ].map((btn) => (
                <Button
                  key={btn.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (sortBy !== btn.id) {
                      handleSort(btn.id as any);
                    } else {
                      handleSort(btn.id as any);
                    }
                  }}
                  className={cn(
                    "h-8 text-[10px] font-bold px-3 transition-all gap-1.5",
                    sortBy === btn.id ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {btn.label}
                  {sortBy === btn.id && (
                    sortOrder === 'asc' ? <ChevronDown className="w-3 h-3 rotate-180" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </Button>
              ))}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search matching..."
                className="pl-9 bg-white h-9"
                value={filters.source || ''}
                onChange={(e) => {
                  if (e.target.value) handleFilter('source', e.target.value);
                  else clearFilter('source');
                }}
              />
            </div>
          </div>
        </CardHeader>

        <div className="px-6 py-3 bg-white border-b flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Quick Filters:</span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (Array.isArray(filters.status) && filters.status.includes('Pending Triage')) {
                const next = filters.status.filter((s: string) => s !== 'Pending Triage');
                if (next.length) handleFilter('status', next); else clearFilter('status');
              } else {
                handleFilter('status', [...(Array.isArray(filters.status) ? filters.status : []), 'Pending Triage']);
              }
            }}
            className={cn(
              "h-7 px-3 rounded-full text-[10px] font-black transition-all gap-1.5",
              Array.isArray(filters.status) && filters.status.includes('Pending Triage') ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" : "bg-white text-slate-500 hover:bg-slate-50"
            )}
          >
            <Zap className={cn("w-3 h-3", Array.isArray(filters.status) && filters.status.includes('Pending Triage') ? "fill-amber-500 text-amber-500" : "")} />
            PENDING TRIAGE
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (Array.isArray(filters.status) && filters.status.includes('Pending Reconciliation')) {
                const next = filters.status.filter((s: string) => s !== 'Pending Reconciliation');
                if (next.length) handleFilter('status', next); else clearFilter('status');
              } else {
                handleFilter('status', [...(Array.isArray(filters.status) ? filters.status : []), 'Pending Reconciliation']);
              }
            }}
            className={cn(
              "h-7 px-3 rounded-full text-[10px] font-black transition-all gap-1.5",
              Array.isArray(filters.status) && filters.status.includes('Pending Reconciliation') ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" : "bg-white text-slate-500 hover:bg-slate-50"
            )}
          >
            <Clock className={cn("w-3 h-3", Array.isArray(filters.status) && filters.status.includes('Pending Reconciliation') ? "text-blue-500" : "")} />
            PENDING RECON
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (filters.date?.type === 'range' && filters.date?.label === 'last30') {
                clearFilter('date');
              } else {
                const date = new Date();
                date.setDate(date.getDate() - 30);
                handleFilter('date', { type: 'range', value: { from: date, to: new Date() }, label: 'last30' });
              }
            }}
            className={cn(
              "h-7 px-3 rounded-full text-[10px] font-black transition-all gap-1.5",
              filters.date?.type === 'range' && filters.date?.label === 'last30' ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" : "bg-white text-slate-500 hover:bg-slate-50"
            )}
          >
            <History className={cn("w-3 h-3", filters.date?.type === 'range' && filters.date?.label === 'last30' ? "text-indigo-500" : "")} />
            LAST 30D
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (filters.date?.type === 'range' && filters.date?.label === 'last90') {
                clearFilter('date');
              } else {
                const date = new Date();
                date.setDate(date.getDate() - 90);
                handleFilter('date', { type: 'range', value: { from: date, to: new Date() }, label: 'last90' });
              }
            }}
            className={cn(
              "h-7 px-3 rounded-full text-[10px] font-black transition-all gap-1.5",
              filters.date?.type === 'range' && filters.date?.label === 'last90' ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" : "bg-white text-slate-500 hover:bg-slate-50"
            )}
          >
            <History className={cn("w-3 h-3", filters.date?.type === 'range' && filters.date?.label === 'last90' ? "text-indigo-500" : "")} />
            LAST 90D
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (Array.isArray(filters.category) && filters.category.some(c => slush.map(s => s.name).includes(c))) {
                clearFilter('category');
              } else {
                handleFilter('category', slush.map(s => s.name));
              }
            }}
            className={cn(
              "h-7 px-3 rounded-full text-[10px] font-black transition-all gap-1.5",
              Array.isArray(filters.category) && filters.category.some(c => slush.map(s => s.name).includes(c)) ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" : "bg-white text-slate-500 hover:bg-slate-50"
            )}
          >
            <Calculator className={cn("w-3 h-3", Array.isArray(filters.category) && filters.category.some(c => slush.map(s => s.name).includes(c)) ? "text-rose-500" : "")} />
            SLUSH FUND
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                emergencyClearAll();
              }}
              className="h-7 px-2 text-[10px] text-slate-400 hover:text-slate-600 font-bold ml-auto gap-1"
            >
              <FilterX className="w-3 h-3" />
              Clear All
            </Button>
          )}
        </div>

        <CardContent className="flex-1 overflow-hidden p-0 relative">
          <div
            ref={parentRef}
            className="h-full w-full overflow-y-auto overflow-x-auto relative"
          >
            <table className="w-full text-sm text-left relative min-w-[1000px]">
              <TransactionsTableHeader
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                onFilter={handleFilter}
                onClearFilter={clearFilter}
                filters={filters}
                filterOptions={filterOptions}
                onSelectAll={(checked) => {
                  if (checked) {
                    selectAll(filteredAndSortedTransactions.map(t => t.id));
                  } else {
                    clearSelection();
                  }
                }}
                isAllSelected={
                  filteredAndSortedTransactions.length > 0 &&
                  filteredAndSortedTransactions.every(t => selectedIds.has(t.id))
                }
              />
              <tbody>
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: `${paddingTop}px` }} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const transaction = filteredAndSortedTransactions[virtualRow.index];
                  if (!transaction) return null;
                  return (
                    <TransactionsTableRow
                      key={transaction.id}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      transaction={transaction}
                      isSelected={selectedIds.has(transaction.id)}
                      onToggleSelection={toggleSelection}
                      editingCell={editingCell}
                      onCellEdit={handleCellEdit}
                      onBulkEdit={handleBulkCellEdit}
                      onStartEdit={handleStartEdit}
                      onStopEdit={handleStopEdit}
                      onDelete={handleDelete}
                      onSplit={handleSplit}
                      onRowClick={handleRowClick}
                      projections={projections}
                      knownSources={knownSources}
                      allTransactions={transactions}
                      isSaving={isSaving(transaction.id)}
                    />
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: `${paddingBottom}px` }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <UnifiedAddTransactionsDialog
        open={addTransactionsOpen}
        onOpenChange={setAddTransactionsOpen}
        onAdd={handleAddTransaction}
        onImport={handleImport}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onEdit={() => setBulkEditOpen(true)}
        onDelete={() => setDeleteConfirmOpen(true)}
        isBulkUpdating={isBulkUpdating}
        isBulkDeleting={isBulkDeleting}
      />

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedCount={selectedIds.size}
        onApply={(updates) => {
          bulkUpdate({ ids: Array.from(selectedIds), updates });
        }}
      />

      <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
              {transactionToDelete && (
                <div className="mt-2 p-2 bg-muted rounded border border-border text-xs font-mono">
                  {transactions.find(t => t.id === transactionToDelete)?.description}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSingleDelete}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedIds.size} transaction{selectedIds.size > 1 ? 's' : ''} from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkDelete(Array.from(selectedIds));
                setDeleteConfirmOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 focus:ring-red-600"
            >
              Delete Transactions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {transactionToSplit && (
        <TransactionSplitModal
          open={splitModalOpen}
          onOpenChange={(open) => {
            setSplitModalOpen(open);
            if (!open) setTransactionToSplit(null);
          }}
          transaction={transactionToSplit}
          onSplitComplete={() => {
            window.location.reload();
          }}
        />
      )}

      <TransactionEditDrawer
        transaction={transactionToEdit}
        onClose={() => setTransactionToEdit(null)}
        onSave={(id, updates) => bulkUpdate({ ids: [id], updates })}
      />
    </div >
  );
};
