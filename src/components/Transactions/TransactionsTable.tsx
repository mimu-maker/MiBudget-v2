import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, LayoutPanelLeft } from 'lucide-react';
import { UnifiedAddTransactionsDialog } from './UnifiedAddTransactionsDialog';
import { ValidationDashboard } from './ValidationDashboard';
import { TransactionsTableHeader } from './TransactionsTableHeader';
import { TransactionsTableRow } from './TransactionsTableRow';
import { useTransactionTable, Transaction } from './hooks/useTransactionTable';
import { filterTransactions, sortTransactions } from './utils/transactionUtils';
import { BulkActionBar } from './BulkActionBar';
import { BulkEditDialog } from './BulkEditDialog';
import { usePeriod } from '@/contexts/PeriodContext';
import { filterByPeriod } from '@/lib/dateUtils';
import { PeriodSelector } from '@/components/PeriodSelector';
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
    handleImport,
    handleAddTransaction,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkUpdate,
    bulkDelete,
    deleteTransaction,
    isLoading,
    isError
  } = useTransactionTable();

  const { selectedPeriod, customDateRange } = usePeriod();
  const [addTransactionsOpen, setAddTransactionsOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'validation'>('table');
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const filteredAndSortedTransactions = useMemo(() => {
    let periodFiltered = filterByPeriod(transactions, selectedPeriod, customDateRange);

    // Always filter out budget === 'Exclude'
    periodFiltered = periodFiltered.filter(t => t.budget !== 'Exclude');

    const tableFiltered = filterTransactions(periodFiltered, filters);
    return sortTransactions(tableFiltered, sortBy, sortOrder);
  }, [transactions, selectedPeriod, customDateRange, filters, sortBy, sortOrder]);

  const handleStartEdit = (id: string, field: keyof typeof transactions[0]) => {
    setEditingCell({ id, field });
  };

  const handleSingleDelete = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete); // Call the delete function from useTransactionTable
      setTransactionToDelete(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>

        <div className="flex items-center space-x-2">
          <div className="mr-2">
            <PeriodSelector />
          </div>
          <Button
            size="lg"
            onClick={() => setAddTransactionsOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Transactions
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg animate-pulse flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
          <span className="text-blue-700 text-sm font-medium">Syncing with cloud database... This may take a moment for large datasets.</span>
        </div>
      )}

      {isError && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-amber-500 rounded-full mr-3" />
            <span className="text-amber-700 text-sm font-medium">Running in Local Mode. Cloud sync is currently unavailable.</span>
          </div>
        </div>
      )}

      {viewMode === 'table' ? (
        <>
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={() => setViewMode('validation')}>
              <LayoutPanelLeft className="w-4 h-4 mr-2" />
              Go to Validation Dashboard
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>All Transactions ({filteredAndSortedTransactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <TransactionsTableHeader
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    onFilter={handleFilter}
                    onClearFilter={clearFilter}
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
                    {filteredAndSortedTransactions.map((transaction) => (
                      <TransactionsTableRow
                        key={transaction.id}
                        transaction={transaction}
                        isSelected={selectedIds.has(transaction.id)}
                        onToggleSelection={toggleSelection}
                        editingCell={editingCell}
                        onCellEdit={handleCellEdit}
                        onStartEdit={handleStartEdit}
                        onStopEdit={() => setEditingCell(null)}
                        onDelete={(id) => setTransactionToDelete(id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={() => setViewMode('table')}>
              Back to Table
            </Button>
          </div>
          <ValidationDashboard />
        </>
      )}

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
    </div>
  );
};
