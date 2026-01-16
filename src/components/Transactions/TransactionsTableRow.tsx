
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
}

export const TransactionsTableRow = ({
  transaction,
  isSelected,
  onToggleSelection,
  editingCell,
  onCellEdit,
  onStartEdit,
  onStopEdit
}: TransactionsTableRowProps) => {
  const isEditing = (field: keyof Transaction) =>
    editingCell?.id === transaction.id && editingCell?.field === field;

  return (
    <tr
      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${transaction.budget === 'Exclude' ? 'opacity-50' : ''
        } ${isSelected ? 'bg-blue-50/50' : ''}`}
    >
      <td className="py-3 px-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(transaction.id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
            field="description"
            isEditing={isEditing('description')}
            onEdit={onCellEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
          />
          {transaction.note && (
            <div className="text-xs text-gray-500 mt-1">{transaction.note}</div>
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
    </tr>
  );
};
