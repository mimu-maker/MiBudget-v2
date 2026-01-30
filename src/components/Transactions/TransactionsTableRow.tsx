
import { Trash2, Store, Sparkles, Search, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EditableCell } from './EditableCell';
import { Transaction } from './hooks/useTransactionTable';
import { useState } from 'react';
import { MerchantNameSelector } from './MerchantNameSelector';
import { MerchantResolveDialog } from './MerchantResolveDialog';
import { MerchantApplyDialog } from './MerchantApplyDialog';
import { TransactionNote } from './TransactionNote';

interface TransactionsTableRowProps {
  transaction: Transaction;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  editingCell: { id: string, field: keyof Transaction } | null;
  onCellEdit: (id: string, field: keyof Transaction, value: any) => void;
  onBulkEdit: (id: string, updates: Partial<Transaction>) => void;
  onStartEdit: (id: string, field: keyof Transaction) => void;
  onStopEdit: () => void;
  onDelete: (id: string) => void;
  onSplit: (transaction: Transaction) => void;
  onRowClick: (transaction: Transaction) => void;
  projections?: any[];
  knownMerchants?: Set<string>;
  allTransactions?: Transaction[];
}

export const TransactionsTableRow = ({
  transaction,
  isSelected,
  onToggleSelection,
  editingCell,
  onCellEdit,
  onBulkEdit,
  onStartEdit,
  onStopEdit,
  onDelete,
  onSplit,
  onRowClick,
  projections,
  knownMerchants,
  allTransactions = []
}: TransactionsTableRowProps) => {
  const isEditing = (field: keyof Transaction) =>
    editingCell?.id === transaction.id && editingCell?.field === field;

  /* State for resolution dialog (Wizard) */
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [pendingResolveName, setPendingResolveName] = useState<string | undefined>(undefined);

  /* State for Apply Existing Dialog */
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [pendingApplyName, setPendingApplyName] = useState('');

  // Blue Pill Logic: Only if we have a clean name AND it matches a known merchant rule
  const isResolved = transaction.clean_merchant && knownMerchants?.has(transaction.clean_merchant);

  return (
    <>
      <MerchantResolveDialog
        transaction={transaction}
        open={showResolveDialog}
        onOpenChange={setShowResolveDialog}
        initialName={pendingResolveName}
        allTransactions={allTransactions}
      />

      <MerchantApplyDialog
        open={showApplyDialog}
        onOpenChange={setShowApplyDialog}
        transaction={transaction}
        targetMerchantName={pendingApplyName}
        allTransactions={allTransactions}
        onSuccess={() => {
          // Optimistic update if needed, but table should refresh
          onStopEdit();
        }}
      />

      <tr
        className={`border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer ${transaction.excluded ? 'opacity-40 bg-muted/20' : ''
          } ${isSelected ? 'bg-primary/10' : ''}`}
      >
        <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(transaction.id)}
            className="rounded border-input bg-background text-primary focus:ring-ring"
          />
        </td>
        <td className="py-3 px-2">
          <EditableCell
            transaction={transaction}
            field="date"
            isEditing={isEditing('date')}
            onEdit={onCellEdit}
            onBulkEdit={onBulkEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
          />
        </td>
        <td className="py-3 px-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 group/merchant" onClick={(e) => {
              // Stop propagation so row click doesn't trigger
              e.stopPropagation();
              onStartEdit(transaction.id, 'merchant');
            }}>
              {isEditing('merchant') ? (
                <div className="w-full min-w-[200px]">
                  <MerchantNameSelector
                    value={transaction.clean_merchant || transaction.merchant}
                    onChange={(newValue) => {
                      // newValue is "" for 'Add New Merchant' intent

                      const isKnown = newValue && knownMerchants?.has(newValue);

                      if (isKnown) {
                        // Known merchant -> Prompt to Apply Existing Rule
                        setPendingApplyName(newValue);
                        setShowApplyDialog(true);
                        onStopEdit();
                      } else {
                        // New/Unknown (or explicit Add New) -> Open Wizard
                        setPendingResolveName(newValue || ""); // Pass "" if explicit Add New
                        setShowResolveDialog(true);
                        onStopEdit();
                      }
                    }}
                    className="h-8 text-xs w-full"
                  />
                </div>
              ) : (
                <div className="relative">
                  {/* Re-using EditableCell display logic or custom */}
                  {isResolved ? (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 gap-1.5 py-1 px-2.5 rounded-full inline-flex items-center w-fit">
                      <Store className="w-3 h-3" />
                      {transaction.clean_merchant}
                    </Badge>
                  ) : (
                    <span
                      className="text-sm font-medium text-slate-700 px-1 border-b border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-text"
                      title="Click to Resolve Merchant"
                    >
                      {transaction.clean_merchant || transaction.merchant}
                    </span>
                  )}
                </div>
              )}

              <TransactionNote
                transaction={transaction}
                onSave={(id, note) => onCellEdit(id, 'notes', note)}
              />

              {/* Only show Google Search if not editing */}
              {!isEditing('merchant') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                  title="Search this merchant on Google"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rawMerchant = transaction.merchant;
                    const description = transaction.description || '';
                    const query = `This appears on my bank statement: ${rawMerchant} ${description} denmark. Who is the merchant?`;
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
                  }}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {transaction.description && transaction.description !== transaction.merchant && (
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight italic ml-1 opacity-70">
                {transaction.description}
              </div>
            )}
          </div>
        </td>
        <td className="py-3 px-2 text-right">
          <EditableCell
            transaction={transaction}
            field="amount"
            isEditing={isEditing('amount')}
            onEdit={onCellEdit}
            onBulkEdit={onBulkEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
          />
        </td>

        <td className="py-3 px-2">
          <EditableCell
            transaction={transaction}
            field="status"
            isEditing={isEditing('status')}
            onEdit={onCellEdit}
            onBulkEdit={onBulkEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
          />
        </td>
        <td className="py-3 px-2">
          <EditableCell
            transaction={transaction}
            field="category"
            isEditing={isEditing('category')}
            onEdit={onCellEdit}
            onBulkEdit={onBulkEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
          />
        </td>
        <td className="py-3 px-2">
          <EditableCell
            transaction={transaction}
            field="sub_category"
            isEditing={isEditing('sub_category')}
            onEdit={onCellEdit}
            onBulkEdit={onBulkEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
          />
        </td>
        <td className="py-3 px-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <EditableCell
              transaction={transaction}
              field="planned"
              isEditing={isEditing('planned')}
              onEdit={onCellEdit}
              onBulkEdit={onBulkEdit}
              onStartEdit={onStartEdit}
              onStopEdit={onStopEdit}
            />
            {transaction.projection_id && (
              <span title="Matched to Projection">
                <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-2">
          <EditableCell
            transaction={transaction}
            field="recurring"
            isEditing={isEditing('recurring')}
            onEdit={onCellEdit}
            onBulkEdit={onBulkEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
          />
        </td>
        <td className="py-3 px-2 text-center">
          <EditableCell
            transaction={transaction}
            field="excluded"
            isEditing={isEditing('excluded')}
            onEdit={onCellEdit}
            onBulkEdit={onBulkEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
          />
        </td>
        <td className="py-3 px-2">
          <EditableCell
            transaction={transaction}
            field="projection_id"
            isEditing={isEditing('projection_id')}
            onEdit={onCellEdit}
            onBulkEdit={onBulkEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
            projections={projections}
          />
        </td>
        <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSplit(transaction)}
              className="text-muted-foreground hover:text-blue-600 transition-colors h-8 w-8 p-0"
              title="Split / Itemize Transaction"
            >
              <Scissors className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(transaction.id)}
              className="text-muted-foreground hover:text-destructive transition-colors h-8 w-8 p-0"
              title="Delete Transaction"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </td>
      </tr>
    </>
  );
};
