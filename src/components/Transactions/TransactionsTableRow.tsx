
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditableCell } from './EditableCell';
import { Transaction } from './hooks/useTransactionTable';

interface TransactionsTableRowProps {
  transaction: Transaction;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  editingCell: { id: string, field: keyof Transaction } | null;
  onCellEdit: (id: string, field: keyof Transaction, value: any) => void;
  onStartEdit: (id: string, field: keyof Transaction) => void;
  onStopEdit: () => void;
  onDelete: (id: string) => void;
}

export const TransactionsTableRow = ({
  transaction,
  isSelected,
  onToggleSelection,
  editingCell,
  onCellEdit,
  onStartEdit,
  onStopEdit,
  onDelete
}: TransactionsTableRowProps) => {
  const isEditing = (field: keyof Transaction) =>
    editingCell?.id === transaction.id && editingCell?.field === field;

  return (
    <tr
      className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${transaction.budget === 'Exclude' || transaction.excluded ? 'opacity-40 bg-muted/20' : ''
        } ${isSelected ? 'bg-primary/10' : ''}`}
    >
      <td className="py-3 px-2">
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
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
        />
      </td>
      <td className="py-3 px-2">
        <div>
          <EditableCell
            transaction={transaction}
            field="merchant"
            isEditing={isEditing('merchant')}
            onEdit={onCellEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
          />
          {transaction.description && (
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight italic">
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
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
        />
      </td>
      <td className="py-3 px-2">
        <EditableCell
          transaction={transaction}
          field="account"
          isEditing={isEditing('account')}
          onEdit={onCellEdit}
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
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
        />
      </td>
      <td className="py-3 px-2">
        <EditableCell
          transaction={transaction}
          field="budget"
          isEditing={isEditing('budget')}
          onEdit={onCellEdit}
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
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
        />
      </td>
      <td className="py-3 px-2">
        <EditableCell
          transaction={transaction}
          field="subCategory"
          isEditing={isEditing('subCategory')}
          onEdit={onCellEdit}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
        />
      </td>
      <td className="py-3 px-2 text-center">
        <EditableCell
          transaction={transaction}
          field="planned"
          isEditing={isEditing('planned')}
          onEdit={onCellEdit}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
        />
      </td>
      <td className="py-3 px-2">
        <EditableCell
          transaction={transaction}
          field="recurring"
          isEditing={isEditing('recurring')}
          onEdit={onCellEdit}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
        />
      </td>
      <td className="py-3 px-2 text-center">
        <input
          type="checkbox"
          checked={transaction.excluded || false}
          onChange={(e) => onCellEdit(transaction.id, 'excluded', e.target.checked)}
          className="rounded border-input bg-background text-primary focus:ring-ring"
        />
      </td>
      <td className="py-3 px-2 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(transaction.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
};
