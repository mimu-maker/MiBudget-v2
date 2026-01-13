
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, LayoutPanelLeft } from 'lucide-react';
import { CsvImportDialog } from './CsvImportDialog';
import { ValidationDashboard } from './ValidationDashboard';
import { AddTransactionDialog } from './AddTransactionDialog';
import { TransactionsTableHeader } from './TransactionsTableHeader';
import { TransactionsTableRow } from './TransactionsTableRow';
import { useTransactionTable } from './hooks/useTransactionTable';
import { filterTransactions, sortTransactions } from './utils/transactionUtils';

export const TransactionsTable = () => {
  const {
    transactions,
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
    handleAddTransaction
  } = useTransactionTable();

  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'validation'>('table');

  const filteredAndSortedTransactions = sortTransactions(
    filterTransactions(transactions, filters),
    sortBy,
    sortOrder
  );

  const handleStartEdit = (id: string, field: keyof typeof transactions[0]) => {
    setEditingCell({ id, field });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setCsvImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </Button>
          <Button size="sm" onClick={() => setAddTransactionOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

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
                  />
                  <tbody>
                    {filteredAndSortedTransactions.map((transaction) => (
                      <TransactionsTableRow
                        key={transaction.id}
                        transaction={transaction}
                        editingCell={editingCell}
                        onCellEdit={handleCellEdit}
                        onStartEdit={handleStartEdit}
                        onStopEdit={() => setEditingCell(null)}
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

      <CsvImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onImport={handleImport}
      />

      <AddTransactionDialog
        open={addTransactionOpen}
        onOpenChange={setAddTransactionOpen}
        onAdd={handleAddTransaction}
      />
    </div>
  );
};
