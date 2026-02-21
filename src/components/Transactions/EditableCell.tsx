import { useState, useEffect } from 'react';
import { Trash2, Store, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategorySelectContent } from '@/components/Budget/CategorySelectContent';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Transaction, useTransactionTable } from './hooks/useTransactionTable';
import { getStatusBadgeVariant, getBudgetBadgeVariant } from './utils/transactionUtils';
import { APP_STATUSES, useSettings } from '@/hooks/useSettings';
import { useCategorySource, useUnifiedCategoryActions } from '@/hooks/useBudgetCategories';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { useProfile } from '@/contexts/ProfileContext';
import { SmartSelector } from '@/components/ui/smart-selector';
import { formatCurrency, formatDate, formatBudgetMonth } from '@/lib/formatUtils';
import { addMonths, startOfMonth, format, parseISO } from 'date-fns';

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
  isSaving?: boolean;
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
  projections,
  isSaving
}: EditableCellProps) => {
  const { settings } = useSettings();
  const { userProfile } = useProfile();
  const { addCategory, addSubCategory } = useUnifiedCategoryActions();
  const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();
  const { transactions } = useTransactionTable();
  const value = transaction[field];

  const [localValue, setLocalValue] = useState(String(value || ''));
  const [isEnteringEntity, setIsEnteringEntity] = useState(false);
  const [pendingStatusSelection, setPendingStatusSelection] = useState<string | null>(null);

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(String(value || ''));
    setPendingStatusSelection(null); // Reset pending selection on prop change
  }, [value]);

  if (isEditing) {
    // ... (no changes in editing block)
    if (field === 'account' || field === 'status' || field === 'category' || field === 'sub_category') {
      const options = {
        account: settings.accounts,
        status: APP_STATUSES,
        category: displayCategories,
        sub_category: displaySubCategories?.[transaction.category] || []
      };


      // Get unique entity names from existing transactions
      const existingEntities = Array.from(new Set(
        transactions
          .filter(t => t.entity)
          .map(t => t.entity!)
      )).sort();

      // Handle specific entity assignment
      const handleStatusChange = (newStatus: string) => {
        setPendingStatusSelection(newStatus);

        if (newStatus === 'Pending Reconciliation') {
          // If simply selecting the base status, we don't change it immediately
          // The UI will show the secondary dropdown because the select value matches 'Pending Reconciliation'
          onEdit(transaction.id, field, 'Pending Reconciliation');
        } else {
          onEdit(transaction.id, field, newStatus);
        }
      };

      const handleEntityAssignment = (name: string) => {
        if (name === 'new') {
          setIsEnteringEntity(true);
        } else {
          onBulkEdit(transaction.id, { status: 'Pending Reconciliation', entity: name });
          onStopEdit();
        }
      };

      // ... existing category/sub-category handles ...
      const handleCategoryChange = async (newCategory: string) => {
        if (newCategory === 'add-new') {
          const name = prompt("Enter new category name:");
          if (name) {
            await addCategory(name);
            onEdit(transaction.id, 'category', name);
            onEdit(transaction.id, 'sub_category', null);
          }
          return;
        }

        const currentSubCategory = transaction.sub_category;
        const newCategorySubCategories = displaySubCategories?.[newCategory] || [];
        const shouldKeepSubCategory = currentSubCategory && newCategorySubCategories.includes(currentSubCategory);

        const updates: Partial<Transaction> = { category: newCategory };
        if (!shouldKeepSubCategory) {
          updates.sub_category = null;
        }

        onBulkEdit(transaction.id, updates);
      };

      const handleSubCategoryChange = async (newValue: string) => {
        if (newValue === 'add-new') {
          const newSubCategory = prompt('Enter new sub-category:');
          if (newSubCategory && transaction.category) {
            await addSubCategory(transaction.category, newSubCategory);
            onEdit(transaction.id, 'sub_category', newSubCategory);
          }
        } else {
          onEdit(transaction.id, 'sub_category', newValue);
        }
      };


      // Ensure that 'Pending: John' matches 'Pending Reconciliation' in the main Select value
      // Use pendingStatusSelection if available to prevent flickering or premature closing
      const currentValueStr = pendingStatusSelection || String(value);
      const isPending = currentValueStr.startsWith('Pending: ') || currentValueStr === 'Pending Reconciliation' || !!transaction.entity;

      const displayValue = field === 'status' && isPending
        ? 'Pending Reconciliation'
        : String(value);

      if (field === 'category') {
        return (
          <CategorySelector
            value={displayValue}
            onValueChange={(newValue) => {
              if (newValue.includes(':')) {
                const [cat, sub] = newValue.split(':');
                onBulkEdit(transaction.id, { category: cat, sub_category: sub });
              } else {
                handleCategoryChange(newValue);
              }
              onStopEdit();
            }}
            type={transaction.amount > 0 ? 'income' : 'expense'}
            onAddCategory={() => { }}
            suggestionLimit={3}
            hideSuggestions={true}
            className="min-w-[180px]"
          />
        );
      }

      return (
        <div className="flex gap-1 items-center">
          {field === 'status' || field === 'account' ? (
            <Select
              value={displayValue}
              onValueChange={(newValue) => {
                if (field === 'status') {
                  handleStatusChange(newValue);
                } else {
                  onEdit(transaction.id, field, newValue);
                }
              }}
              onOpenChange={(open) => {
                if (!open && !isPending) {
                  onStopEdit();
                }
              }}
              defaultOpen={true}
            >
              <SelectTrigger className="h-8 min-w-[140px]" autoFocus>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {options[field].map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <SmartSelector
              value={displayValue}
              onValueChange={(newValue) => {
                if (newValue === 'add-new') {
                  handleSubCategoryChange(newValue);
                } else {
                  onEdit(transaction.id, field, newValue);
                }
              }}
              onOpenChange={(open) => !open && onStopEdit()}
              disabled={field === 'sub_category' && !transaction.category}
              options={[
                ...options[field].map(o => ({ label: o, value: o })),
                ...(field === 'sub_category' ? [{ label: '+ Add New Sub-category', value: 'add-new' }] : [])
              ]}
              placeholder={field === 'sub_category' && !transaction.category ? "Select a category first" : "Select..."}
              className="h-8 min-w-[140px]"
            />
          )}


          {/* Secondary Dropdown for Entity Assignment */}
          {field === 'status' && isPending && (
            isEnteringEntity ? (
              <Input
                autoFocus
                className="h-8 w-[140px] bg-amber-50 border-amber-200 text-amber-900 placeholder:text-amber-900/50"
                placeholder="Type Name..."
                onBlur={(e) => {
                  if (e.target.value) {
                    onBulkEdit(transaction.id, { status: 'Pending Reconciliation', entity: e.target.value });
                    setIsEnteringEntity(false);
                    onStopEdit();
                  } else {
                    setIsEnteringEntity(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onBulkEdit(transaction.id, { status: 'Pending Reconciliation', entity: e.currentTarget.value });
                    setIsEnteringEntity(false);
                    onStopEdit();
                  }
                  if (e.key === 'Escape') {
                    setIsEnteringEntity(false);
                  }
                }}
              />
            ) : (
              <Select
                value={transaction.entity || (String(value).startsWith('Pending: ') ? String(value).replace('Pending: ', '') : '')}
                onValueChange={handleEntityAssignment}
              >
                <SelectTrigger className="h-8 min-w-[120px] bg-amber-50 border-amber-200 text-amber-900">
                  <SelectValue placeholder="Assign Entity..." />
                </SelectTrigger>
                <SelectContent>
                  {existingEntities.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                  <SelectItem value="new" className="text-blue-600 font-medium">+ New Entity</SelectItem>
                </SelectContent>
              </Select>
            )
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
    } else if (field === 'budget_month') {
      // Generate options for the next 24 months
      const options = Array.from({ length: 36 }, (_, i) => {
        const date = addMonths(startOfMonth(new Date()), i - 12); // From 12 months ago to 24 months future
        return {
          value: format(date, 'yyyy-MM-01'),
          label: format(date, 'MMM yy')
        };
      });

      return (
        <Select
          value={String(value || '')}
          onValueChange={(newValue) => {
            const date = parseISO(newValue);
            onBulkEdit(transaction.id, {
              budget_month: newValue,
              budget_year: date.getFullYear()
            });
            onStopEdit();
          }}
          onOpenChange={(open) => !open && onStopEdit()}
          defaultOpen={true}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    } else if (field === 'budget_year') {
      const currentYear = new Date().getFullYear();
      const options = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

      return (
        <Select
          value={String(value || currentYear)}
          onValueChange={(newValue) => {
            onEdit(transaction.id, field, parseInt(newValue));
            onStopEdit();
          }}
          onOpenChange={(open) => !open && onStopEdit()}
          defaultOpen={true}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
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
                {p.date.slice(5)} - {p.source} ({p.amount > 0 ? '+' : ''}{p.amount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    } else {
      return (
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => {
            const newValue = field === 'amount' ? parseFloat(localValue) || 0 : localValue;
            onEdit(transaction.id, field, newValue);
            onStopEdit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const newValue = field === 'amount' ? parseFloat(localValue) || 0 : localValue;
              onEdit(transaction.id, field, newValue);
              onStopEdit();
            }
          }}
          className="h-8"
          autoFocus
        />
      );
    }
  }

  if (isSaving) {
    return (
      <div className="flex items-center justify-center p-1 h-full min-h-[32px]">
        <Spinner size="sm" className="text-blue-500" />
      </div>
    );
  }

  const isDynamicField = field === 'date' || field === 'amount';

  return (
    <div
      onClick={(e) => {
        // Prevent row click when clicking cell
        e.stopPropagation();
        onStartEdit(transaction.id, field);
      }}
      className={`cursor-pointer hover:bg-accent p-1 rounded transition-colors ${isDynamicField ? 'dynamic-text-container' : ''}`}
    >
      {customDisplay ? (
        customDisplay
      ) : field === 'amount' ? (
        <span className={`font-bold ${transaction.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'} dynamic-text text-right`}>
          {formatCurrency(transaction.amount, settings.currency)}
        </span>
      ) : field === 'date' ? (
        <span className="dynamic-text">
          {formatDate(String(value), userProfile?.show_time, userProfile?.date_format)}
        </span>

      ) : field === 'status' ? (
        <Badge variant={getStatusBadgeVariant(String(value))} className="whitespace-normal h-auto text-center px-1.5 py-0.5 text-[10px] leading-tight justify-center">
          {String(value) === 'Reconciled'
            ? (transaction.entity ? `Reconciled: ${transaction.entity}` : 'Reconciled')
            : (transaction.entity || String(value).startsWith('Pending: ')
              ? `Pending ${transaction.entity || String(value).replace('Pending: ', '')}`
              : String(value))}
        </Badge>
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
            {projections?.find(p => p.id === value)?.source || 'Linked'}
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
