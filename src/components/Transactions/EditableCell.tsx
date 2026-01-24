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
  onBulkEdit: (id: string, updates: Partial<Transaction>) => void;
  onStartEdit: (id: string, field: keyof Transaction) => void;
  onStopEdit: () => void;
}

export const EditableCell = ({
  transaction,
  field,
  isEditing,
  onEdit,
  onBulkEdit,
  onStartEdit,
  onStopEdit
}: EditableCellProps) => {
  const { settings, addSubCategory } = useSettings();
  const value = transaction[field];

  if (isEditing) {
    if (field === 'account' || field === 'status' || field === 'category' || field === 'sub_category') {
      const options = {
        account: settings.accounts,
        status: APP_STATUSES,
        category: settings.categories,
        sub_category: settings.subCategories?.[transaction.category] || []
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

      // Handle category change - preserve sub-category if it exists under new category
      const handleCategoryChange = (newCategory: string) => {
        // Check if current sub-category exists under the new category
        const currentSubCategory = transaction.sub_category;
        const newCategorySubCategories = settings.subCategories?.[newCategory] || [];
        const shouldKeepSubCategory = currentSubCategory && newCategorySubCategories.includes(currentSubCategory);
        
        // Create updates object for atomic change
        const updates: Partial<Transaction> = { category: newCategory };
        if (!shouldKeepSubCategory) {
          updates.sub_category = null;
        }
        
        // Use bulk edit for atomic update
        onBulkEdit(transaction.id, updates);
      };

      // Handle sub-category change with "+ New" option
      const handleSubCategoryChange = (newValue: string) => {
        if (newValue === 'add-new') {
          const newSubCategory = prompt('Enter new sub-category:');
          if (newSubCategory && transaction.category) {
            // Add the new sub-category to settings
            addSubCategory(transaction.category, newSubCategory);
            onEdit(transaction.id, 'sub_category', newSubCategory);
          }
        } else {
          onEdit(transaction.id, 'sub_category', newValue);
        }
      };

      // Ensure that 'Pending: John' matches 'Pending Person/Event' in the Select value
      const displayValue = field === 'status' && String(value).startsWith('Pending: ')
        ? 'Pending Person/Event'
        : String(value);

      return (
        <Select
          value={displayValue}
          onValueChange={(newValue) => {
            if (field === 'status') {
              handleStatusChange(newValue);
            } else if (field === 'category') {
              handleCategoryChange(newValue);
            } else if (field === 'sub_category') {
              handleSubCategoryChange(newValue);
            } else {
              onEdit(transaction.id, field, newValue);
            }
          }}
          onOpenChange={(open) => !open && onStopEdit()}
          disabled={field === 'sub_category' && !transaction.category}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder={field === 'sub_category' && !transaction.category ? "Select a category first" : "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {options[field].map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
            {field === 'sub_category' && transaction.category && (
              <SelectItem value="add-new" className="text-blue-600 font-medium">
                + Add New Sub-category
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      );
    } else if (field === 'excluded' || field === 'planned') {
      return (
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(checked) => onEdit(transaction.id, field, checked)}
          className="data-[state=checked]:bg-emerald-500"
        />
      );
    } else if (field === 'recurring') {
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
      ) : (field === 'planned' || field === 'excluded') ? (
        <Badge variant={Boolean(value) ? 'default' : 'outline'}>
          {Boolean(value) ? 'Yes' : 'No'}
        </Badge>
      ) : field === 'recurring' ? (
        <Badge variant={Boolean(value) ? 'default' : 'outline'}>
          {Boolean(value) ? 'Yes' : 'No'}
        </Badge>
      ) : (
        String(value || '')
      )}
    </div>
  );
};
