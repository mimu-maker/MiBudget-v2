import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTransactionTable, Transaction } from '@/components/Transactions/hooks/useTransactionTable';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/hooks/useSettings';
import { EditableCell } from '@/components/Transactions/EditableCell';
import { Checkbox } from '@/components/ui/checkbox';
import { TransactionDetailDialog } from '@/components/Transactions/TransactionDetailDialog';

export const ReconciliationOverview = () => {
  const { transactions, handleCellEdit, handleBulkCellEdit, isSaving } = useTransactionTable({ mode: 'all' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<keyof Transaction | null>(null);

  const handleStartEdit = (id: string, field: keyof Transaction) => {
    setEditingId(id);
    setEditingField(field);
  };

  const handleStopEdit = () => {
    setEditingId(null);
    setEditingField(null);
  };

  const handleLocalEdit = (id: string, field: keyof Transaction, value: any) => {
    handleCellEdit(id, field, value);
    // Don't stop edit immediately for status to allow secondary dropdown
    if (field !== 'status') {
      // handleStopEdit(); // Let EditableCell decide when to stop via onStopEdit
    }
  };
  const { settings } = useSettings();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filter for 'Pending' status transactions
  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => {
      const status = t.status || '';
      const isPendingStatus = status === 'Pending Reconciliation' ||
        status.startsWith('Pending: ') ||
        (status.startsWith('Pending ') && !['Pending Triage', 'Pending Categorisation', 'Pending Mapping', 'Pending Validation'].includes(status));
      const hasEntity = !!t.entity;

      const isPending = isPendingStatus || hasEntity;
      // Show regardless of budget category, but respect the explicit 'excluded' flag
      const isNotExcluded = !t.excluded && status !== 'Reconciled';

      return isPending && isNotExcluded;
    });
  }, [transactions]);

  // Default select all pending transactions when they change
  useEffect(() => {
    setSelectedIds(new Set(pendingTransactions.map(t => t.id)));
  }, [pendingTransactions]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const groupedItems = useMemo<Record<string, Transaction[]>>(() => {
    return pendingTransactions.reduce((acc, item) => {
      let group = 'Unassigned';
      if (item.entity) {
        group = item.entity;
      } else if (item.status && item.status.startsWith('Pending: ')) {
        group = item.status.replace('Pending: ', '');
      } else if (item.status && item.status.startsWith('Pending ') &&
        !['Pending Triage', 'Pending Categorisation', 'Pending Mapping', 'Pending Validation', 'Pending Reconciliation'].includes(item.status)) {
        group = item.status.replace('Pending ', '');
      }

      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [pendingTransactions]);

  const summaryStats = useMemo(() => {
    return Object.entries(groupedItems).map(([group, items]) => ({
      group,
      count: items.length,
      total: items.reduce((sum, item) => sum + item.amount, 0)
    })).sort((a, b) => b.total - a.total); // Sort by highest amount owed/due
  }, [groupedItems]);

  const totalPendingBalance = pendingTransactions.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Reconciliation Pivot</h2>
          <p className="text-muted-foreground text-sm">Track items pending valid classification or reimbursement.</p>
        </div>
        <div className="px-6 py-3 bg-card rounded-2xl border shadow-sm flex items-center gap-4">
          <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Net Outstanding</span>
          <span className={`text-xl font-black ${totalPendingBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatCurrency(totalPendingBalance, settings.currency)}
          </span>
        </div>
      </div>

      {/* Pivot Summary Table */}
      {summaryStats.length > 0 && (
        <Card className="border-none shadow-md bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Summary by Person/Event</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="w-[200px]">Entity</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryStats.map((stat) => (
                  <TableRow key={stat.group} className="hover:bg-muted/50 transition-colors border-b border-border/40">
                    <TableCell className="font-bold text-foreground">{stat.group}</TableCell>
                    <TableCell className="text-center font-medium text-muted-foreground">{stat.count}</TableCell>
                    <TableCell className={`text-right font-bold ${stat.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(stat.total, settings.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-8">
        {Object.entries(groupedItems).map(([group, items]) => {
          // Calculate stats based on checked items for this group
          const selectedGroupItems = items.filter(i => selectedIds.has(i.id));
          const selectedTotal = selectedGroupItems.reduce((sum, item) => sum + item.amount, 0);
          const hasSelection = selectedGroupItems.length > 0;
          const isBalanced = Math.abs(selectedTotal) < 0.01;

          return (
            <div key={group} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="h-6 w-1 bg-primary rounded-full"></div>
                <h3 className="font-bold text-lg text-foreground">{group}</h3>
                <Badge variant="secondary" className="ml-auto">{items.length} items</Badge>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-4 p-3 bg-card hover:bg-accent/50 border border-border/40 rounded-xl transition-all shadow-sm cursor-pointer"
                    onClick={() => {
                      setDetailTx(item);
                      setIsDetailOpen(true);
                    }}
                  >
                    <div className="pl-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelection(item.id)}
                      />
                    </div>
                    <div className="w-[100px] text-xs font-bold text-muted-foreground">{item.date}</div>
                    <div className="flex-1 font-medium text-foreground/90 truncate">{item.source}</div>

                    {/* Inline Status Edit to quickly resolve items */}
                    <div className="w-[200px]" onClick={(e) => e.stopPropagation()}>
                      <EditableCell
                        transaction={item}
                        field="status"
                        isEditing={editingId === item.id && editingField === 'status'}
                        onEdit={handleLocalEdit}
                        onBulkEdit={handleBulkCellEdit}
                        onStartEdit={handleStartEdit}
                        onStopEdit={handleStopEdit}
                        isSaving={isSaving(item.id)}
                      />
                    </div>

                    <div className={`w-[120px] text-right font-black ${item.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatCurrency(item.amount, settings.currency)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 px-4 border-t border-border/30 border-dashed items-center gap-4">
                <span className="text-xs uppercase font-bold text-muted-foreground pt-1">
                  {hasSelection ? `Selected Total (${selectedGroupItems.length})` : `Total ${group}`}
                </span>
                <span className={`font-black ${selectedTotal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(selectedTotal, settings.currency)}
                </span>

                <Button
                  size="sm"
                  variant={isBalanced && hasSelection ? "default" : "outline"}
                  disabled={!isBalanced || !hasSelection}
                  onClick={() => {
                    const ids = selectedGroupItems.map(t => t.id);
                    const xref = `Reconciled against ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''}`;

                    selectedGroupItems.forEach(item => {
                      handleBulkCellEdit(item.id, {
                        status: 'Complete',
                        excluded: true,
                        budget: 'Exclude',
                        notes: item.notes ? `${item.notes} | ${xref}` : xref
                      });
                    });
                  }}
                  className={isBalanced && hasSelection
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm"
                    : "opacity-50 cursor-not-allowed"}
                >
                  Reconcile Selected
                </Button>
              </div>
            </div>
          );
        })}

        {pendingTransactions.length === 0 && (
          <div className="text-center py-24 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
            <div className="max-w-md mx-auto space-y-4">
              <p className="text-3xl font-black text-foreground/10 tracking-tighter uppercase">All Clear</p>
              <p className="text-muted-foreground font-medium">No pending reconciliation items found. You are all caught up!</p>
            </div>
          </div>
        )}
      </div>

      <TransactionDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        transaction={detailTx}
        initialEditMode={true}
        onSave={async (updates) => {
          if (detailTx) {
            await handleBulkCellEdit(detailTx.id, updates);
            setIsDetailOpen(false);
          }
        }}
      />
    </div>
  );
};
