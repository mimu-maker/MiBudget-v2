import { Trash2, Store, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Transaction, useTransactionTable } from './hooks/useTransactionTable';
import { getStatusBadgeVariant, getBudgetBadgeVariant } from './utils/transactionUtils';
import { APP_STATUSES, useSettings } from '@/hooks/useSettings';
import { useCategorySource } from '@/hooks/useBudgetCategories';
import { formatCurrency } from '@/lib/formatUtils';

interface EditableCellProps {
  transaction: Transaction;
  field: keyof Transaction;
  isEditing: boolean;
  onEdit: (id: string, field: keyof Transaction, value: any) => void;
  onBulkEdit: (id: string, updates: Partial<Transaction>) => void;
  onStartEdit: (id: string, field: keyof Transaction) => void;
  onStopEdit: () => void;
  customDisplay?: React.ReactNode;
  projections?: any[];
}

export const EditableCell = ({
  transaction,
  field,
  isEditing,
  onEdit,
  onBulkEdit,
  onStartEdit,
  onStopEdit,
  customDisplay,
  projections
}: EditableCellProps) => {
  const { settings, addSubCategory } = useSettings();
  const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();
  const { transactions } = useTransactionTable();
  const value = transaction[field];

  if (isEditing) {
    if (field === 'account' || field === 'status' || field === 'category' || field === 'sub_category') {
      const options = {
        account: settings.accounts,
        status: APP_STATUSES,
        category: displayCategories,
        sub_category: displaySubCategories?.[transaction.category] || []
      };

      // Get unique pending names from existing transactions
      const existingPendingNames = Array.from(new Set(
        transactions
          .filter(t => t.status && t.status.startsWith('Pending: '))
          .map(t => t.status.replace('Pending: ', ''))
      )).sort();

      const handleStatusChange = (newStatus: string) => {
        if (newStatus === 'Pending Reconciliation') {
          // If simply selecting the base status, we don't change it immediately
          // The UI will show the secondary dropdown because the select value matches 'Pending Reconciliation'
          onEdit(transaction.id, field, 'Pending Reconciliation');
        } else if (newStatus.startsWith('Pending: ')) {
          onEdit(transaction.id, field, newStatus);
        } else {
          onEdit(transaction.id, field, newStatus);
        }
      };

      // Handle specific pending assignment
      const handlePendingAssignment = (name: string) => {
        if (name === 'new') {
          const person = prompt("Enter Person or Event name:");
          if (person) {
            onEdit(transaction.id, field, `Pending: ${person}`);
          }
        } else {
          onEdit(transaction.id, field, `Pending: ${name}`);
        }
      };

      // Handle category change - preserve sub-category if it exists under new category
      const handleCategoryChange = (newCategory: string) => {
        // Check if current sub-category exists under the new category
        const currentSubCategory = transaction.sub_category;
        const newCategorySubCategories = displaySubCategories?.[newCategory] || [];
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

      // Ensure that 'Pending: John' matches 'Pending Reconciliation' in the main Select value
      const isPending = String(value).startsWith('Pending: ') || String(value) === 'Pending Reconciliation';
      const displayValue = field === 'status' && isPending
        ? 'Pending Reconciliation'
        : String(value);

      return (
        <div className="flex gap-1 items-center">
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
            onOpenChange={(open) => !open && !isPending && onStopEdit()}
            disabled={field === 'sub_category' && !transaction.category}
            defaultOpen={true}
          >
            <SelectTrigger className="h-8 min-w-[140px]">
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

          {/* Secondary Dropdown for Pending Assignment */}
          {field === 'status' && isPending && (
            <Select
              value={String(value).startsWith('Pending: ') ? String(value).replace('Pending: ', '') : ''}
              onValueChange={handlePendingAssignment}
            >
              <SelectTrigger className="h-8 w-[120px] bg-amber-50 border-amber-200 text-amber-900">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                {existingPendingNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
                <SelectItem value="new" className="text-blue-600 font-medium">+ New Person/Event</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
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
      const intervals = ['N/A', 'Monthly', 'Annually', 'Bi-annually', 'Quarterly', 'Weekly', 'One-off'];
      return (
        <Select
          value={String(value || 'N/A')}
          onValueChange={(newValue) => onEdit(transaction.id, field, newValue)}
          onOpenChange={(open) => !open && onStopEdit()}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {intervals.map(interval => (
              <SelectItem key={interval} value={interval}>{interval}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    } else if (field === 'projection_id') {
      return (
        <Select
          value={String(value || 'none')}
          onValueChange={(newValue) => onEdit(transaction.id, field, newValue === 'none' ? null : newValue)}
          onOpenChange={(open) => !open && onStopEdit()}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Link..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Projection</SelectItem>
            {projections?.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.date.slice(5)} - {p.merchant} ({p.amount > 0 ? '+' : ''}{p.amount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    } else {
      return (
        <Input
          value={String(value || '')}
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
      onClick={(e) => {
        // Prevent row click when clicking cell
        e.stopPropagation();
        onStartEdit(transaction.id, field);
      }}
      className="cursor-pointer hover:bg-accent p-1 rounded transition-colors"
    >
      {customDisplay ? (
        customDisplay
      ) : field === 'amount' ? (
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
        <Badge variant={value && value !== 'N/A' ? 'default' : 'outline'}>
          {String(value || 'N/A')}
        </Badge>
      ) : field === 'projection_id' ? (
        value ? (
          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 gap-1">
            <Sparkles className="w-3 h-3" />
            {projections?.find(p => p.id === value)?.merchant || 'Linked'}
          </Badge>
        ) : (
          <span className="text-muted-foreground/30 text-[10px] italic">No link</span>
        )
      ) : (
        String(value || '-')
      )}
    </div>
  );
};
