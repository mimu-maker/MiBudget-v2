import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Transaction } from './hooks/useTransactionTable';
import { getStatusBadgeVariant, getBudgetBadgeVariant } from './utils/transactionUtils';
import { APP_STATUSES, useSettings } from '@/hooks/useSettings';
import { formatCurrency } from '@/lib/formatUtils';

interface EditableCellProps {
  transaction: Transaction;
  field: keyof Transaction;
  isEditing: boolean;
  onEdit: (id: string, field: keyof Transaction, value: any) => void;
  onStartEdit: (id: string, field: keyof Transaction) => void;
  onStopEdit: () => void;
}

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
    if (field === 'account' || field === 'status' || field === 'budget' || field === 'category') {
      const options = {
        account: settings.accounts,
        status: APP_STATUSES,
        budget: settings.budgetTypes,
        category: settings.categories
      };

      const handleStatusChange = (newStatus: string) => {
        if (newStatus === 'Pending Person/Event') {
          const person = prompt("Enter Person or Event name:");
          if (person) {
            onEdit(transaction.id, field, `Pending: ${person}`);
          }
        } else {
          onEdit(transaction.id, field, newStatus);
        }
      };

      // Ensure that 'Pending: John' matches 'Pending Person/Event' in the Select value
      const displayValue = field === 'status' && String(value).startsWith('Pending: ')
        ? 'Pending Person/Event'
        : String(value);

      return (
        <Select
          value={displayValue}
          onValueChange={(newValue) => field === 'status' ? handleStatusChange(newValue) : onEdit(transaction.id, field, newValue)}
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
    } else if (field === 'planned' || field === 'recurring') {
      return (
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(checked) => onEdit(transaction.id, field, checked)}
          className="data-[state=checked]:bg-emerald-500"
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
      className="cursor-pointer hover:bg-accent p-1 rounded transition-colors"
    >
      {field === 'amount' ? (
        <span className={`font-bold ${transaction.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {formatCurrency(transaction.amount, settings.currency)}
        </span>
      ) : field === 'status' ? (
        <Badge variant={getStatusBadgeVariant(String(value))}>{String(value)}</Badge>
      ) : field === 'budget' ? (
        <Badge variant={getBudgetBadgeVariant(String(value))}>{String(value)}</Badge>
      ) : (field === 'planned' || field === 'recurring') ? (
        <Badge variant={Boolean(value) ? 'default' : 'outline'}>
          {Boolean(value) ? 'Yes' : 'No'}
        </Badge>
      ) : (
        String(value || '')
      )}
    </div>
  );
};
