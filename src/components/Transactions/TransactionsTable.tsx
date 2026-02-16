import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { UnifiedAddTransactionsDialog } from './UnifiedAddTransactionsDialog';
import { TransactionSplitModal } from './TransactionSplitModal';

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

  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const filteredAndSortedTransactions = transactions;

  const handleStartEdit = (id: string, field: keyof Transaction) => {
    setEditingCell({ id, field });
  };

  const handleSingleDelete = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete); // Call the delete function from useTransactionTable
      setTransactionToDelete(null);
    }
  };

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

      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader className="py-6 px-6 shrink-0 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-2xl font-bold text-foreground">
            All Transactions ({hasActiveFilters ? `${filteredCount} of ${totalCount}` : totalCount})
          </CardTitle>
          <Button
            size="lg"
            onClick={() => setAddTransactionsOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Transactions
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0 relative">
          <div
            ref={parentRef}
            className="h-full w-full overflow-y-auto overflow-x-auto relative"
          >
            {/* The single table container */}
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
                      onStopEdit={() => setEditingCell(null)}
                      onDelete={(id) => {
                        setTransactionToDelete(id);
                        setDeleteConfirmOpen(true);
                      }}
                      onSplit={(t) => {
                        setTransactionToSplit(t);
                        setSplitModalOpen(true);
                      }}
                      onRowClick={() => { }}
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
      )
      }
    </div >
  );
};
