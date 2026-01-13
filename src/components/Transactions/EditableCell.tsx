import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Transaction } from './hooks/useTransactionTable';
import { getStatusBadgeVariant, getBudgetBadgeVariant } from './utils/transactionUtils';
import { useSettings } from '@/hooks/useSettings';

interface EditableCellProps {
  transaction: Transaction;
  field: keyof Transaction;
  isEditing: boolean;
  onEdit: (id: string, field: keyof Transaction, value: any) => void;
  onStartEdit: (id: string, field: keyof Transaction) => void;
  onStopEdit: () => void;
}

// ... (imports)

export const EditableCell = ({
  transaction,
  field,
  isEditing,
  onEdit,
  onStartEdit,
  onStopEdit
}: EditableCellProps) => {
  const { settings } = useSettings();
  const value = transaction[field];

  if (isEditing) {
    if (field === 'account' || field === 'status' || field === 'budget' || field === 'category' || field === 'recurring') {
      const options = {
        account: settings.accounts,
        status: settings.statuses,
        budget: settings.budgetTypes,
        category: settings.categories,
        recurring: settings.recurringOptions
      };

      return (
        <Select
          value={String(value)}
          onValueChange={(newValue) => onEdit(transaction.id, field, newValue)}
          onOpenChange={(open) => !open && onStopEdit()}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options[field].map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    } else if (field === 'planned') {
      return (
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(checked) => onEdit(transaction.id, field, checked)}
        />
      );
    } else {
      return (
        <Input
          value={String(value)}
          onChange={(e) => {
            const newValue = field === 'amount' ? parseFloat(e.target.value) || 0 : e.target.value;
            onEdit(transaction.id, field, newValue);
          }}
          onBlur={onStopEdit}
          onKeyDown={(e) => e.key === 'Enter' && onStopEdit()}
          className="h-8"
          autoFocus
        />
      );
    }
  }

  return (
    <div
      onClick={() => onStartEdit(transaction.id, field)}
      className="cursor-pointer hover:bg-gray-50 p-1 rounded"
    >
      {field === 'amount' ? (
        <span className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {transaction.amount.toLocaleString()} DKK
        </span>
      ) : field === 'status' ? (
        <Badge variant={getStatusBadgeVariant(String(value))}>{String(value)}</Badge>
      ) : field === 'budget' ? (
        <Badge variant={getBudgetBadgeVariant(String(value))}>{String(value)}</Badge>
      ) : field === 'planned' ? (
        <Badge variant={Boolean(value) ? 'default' : 'outline'}>
          {Boolean(value) ? 'Yes' : 'No'}
        </Badge>
      ) : (
        String(value || '')
      )}
    </div>
  );
};
