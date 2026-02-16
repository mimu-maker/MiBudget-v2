
import { Trash2, Store, Sparkles, Split, Edit2, Check, Calendar, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EditableCell } from './EditableCell';
import { Transaction } from './hooks/useTransactionTable';
import { useState, memo, forwardRef } from 'react';
import { SourceNameSelector } from './SourceNameSelector';
import { SourceResolveDialog } from './SourceResolveDialog';
import { SourceApplyDialog } from './SourceApplyDialog';
import { TransactionNote } from './TransactionNote';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { addMonths, startOfMonth, format, parseISO } from 'date-fns';
import { formatBudgetMonth } from '@/lib/formatUtils';

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
  knownSources?: Set<string>;
  allTransactions?: Transaction[];
  'data-index'?: number; // Add for virtualizer
  isSaving?: boolean;
}

export const TransactionsTableRow = memo(forwardRef<HTMLTableRowElement, TransactionsTableRowProps>(({
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
  knownSources,
  allTransactions = [],
  isSaving,
  ...props // Capture other props like data-index
}, ref) => {
  const isEditing = (field: keyof Transaction) =>
    editingCell?.id === transaction.id && editingCell?.field === field;

  /* State for resolution dialog (Wizard) */
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [pendingResolveName, setPendingResolveName] = useState<string | undefined>(undefined);

  /* State for Apply Existing Dialog */
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [pendingApplyName, setPendingApplyName] = useState('');

  // Blue Pill Logic: Derived from hook logic
  const isResolved = transaction.is_resolved;

  return (
    <>
      <SourceResolveDialog
        transaction={transaction}
        open={showResolveDialog}
        onOpenChange={setShowResolveDialog}
        initialName={pendingResolveName}
        allTransactions={allTransactions}
        minimal={true}
      />

      <SourceApplyDialog
        open={showApplyDialog}
        onOpenChange={setShowApplyDialog}
        transaction={transaction}
        targetSourceName={pendingApplyName}
        allTransactions={allTransactions}
        onSuccess={() => {
          // Optimistic update if needed, but table should refresh
          onStopEdit();
        }}
        minimal={true}
      />

      <tr
        ref={ref}
        {...props}
        className={`border-b border-border/50 hover:bg-accent/30 transition-colors row-pazazz ${transaction.excluded ? 'opacity-40 bg-muted/20' : ''
          } ${isSelected ? 'bg-primary/10' : ''} ${isResolved ? 'cursor-pointer' : 'cursor-default'} ${transaction.parent_id ? 'bg-amber-50/20' : ''} ${transaction.is_split ? 'bg-blue-50/10 font-medium' : ''}`}
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
            isSaving={isSaving}
          />
        </td>
        <td className="py-3 px-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 group/source" onClick={(e) => e.stopPropagation()}>
              {isEditing('source') ? (
                <div className="w-full min-w-[200px]">
                  <SourceNameSelector
                    value={transaction.clean_source || transaction.source}
                    hideAddNew={false}
                    onChange={(newValue) => {
                      // If newValue is not in knownSources, it will trigger the resolution dialog
                      const isKnown = newValue && knownSources?.has(newValue);

                      if (isKnown) {
                        setPendingApplyName(newValue);
                        setShowApplyDialog(true);
                        onStopEdit();
                      } else {
                        setPendingResolveName(newValue || "");
                        setShowResolveDialog(true);
                        onStopEdit();
                      }
                    }}
                    className="h-8 text-xs w-full"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {isResolved ? (
                    <div className="flex items-center gap-2">
                      {transaction.parent_id && <div className="w-6 h-px bg-amber-200 ml-2 mr-1" />}
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 gap-1.5 py-1 px-2.5 rounded-full inline-flex items-center w-fit font-bold cursor-pointer transition-all hover:ring-2 hover:ring-blue-100"
                        onClick={() => onStartEdit(transaction.id, 'source')}
                        title="Click to Change Mapping"
                      >
                        <Store className="w-3 h-3" />
                        {transaction.clean_source}
                      </Badge>
                      {transaction.parent_id && (
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-amber-50 text-amber-600 border-amber-200 py-0 px-1.5 h-4 font-black">
                          ITEM
                        </Badge>
                      )}
                      {transaction.is_split && (
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-blue-50 text-blue-600 border-blue-200 py-0 px-1.5 h-4 font-black">
                          SPLIT
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {transaction.parent_id && <div className="w-6 h-px bg-amber-200 ml-2 mr-1" />}
                      <span
                        className="text-sm font-bold text-slate-400 px-1 select-none"
                        title={transaction.source}
                      >
                        {transaction.clean_source || transaction.source}
                      </span>
                      {transaction.parent_id && (
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-amber-50 text-amber-600 border-amber-200 py-0 px-1.5 h-4 font-black">
                          ITEM
                        </Badge>
                      )}
                      {transaction.is_split && (
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-blue-50 text-blue-600 border-blue-200 py-0 px-1.5 h-4 font-black">
                          SPLIT
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Source Actions Popover - Hide for resolved sources */}
              {!isEditing('source') && !isResolved && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 transition-colors h-7 w-7 p-0 flex shrink-0 items-center justify-center rounded-full bg-blue-50 border border-blue-100 shadow-sm opacity-100"
                      title="Source Actions & Discovery"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Search className="w-3.5 h-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 shadow-2xl border-blue-100" align="start" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Associate or Create Source</Label>
                        <SourceNameSelector
                          value={transaction.clean_source || transaction.source}
                          hideAddNew={false}
                          onChange={(newValue) => {
                            const isKnown = newValue && knownSources?.has(newValue);
                            if (isKnown) {
                              setPendingApplyName(newValue);
                              setShowApplyDialog(true);
                            } else {
                              setPendingResolveName(newValue || "");
                              setShowResolveDialog(true);
                            }
                          }}
                          className="h-9"
                        />
                        <p className="text-[10px] text-slate-400 italic">
                          Type to search existing sources or create a new one.
                        </p>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-[10px] font-bold uppercase text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8 gap-2"
                          onClick={() => {
                            const query = encodeURIComponent(`Identify this transaction source: ${transaction.source}`);
                            window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <Search className="w-3.5 h-3.5" />
                          Who is this? (Google Search)
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <TransactionNote
                transaction={transaction}
                onSave={(id, note) => onCellEdit(id, 'notes', note)}
              />
            </div>

            {(transaction.notes || transaction.description) && (transaction.notes !== transaction.source && transaction.description !== transaction.source) && !transaction.notes?.startsWith('Split from') && (
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight italic ml-1 opacity-70">
                {transaction.notes || transaction.description}
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
            isSaving={isSaving}
          />
        </td>

        <td className="py-3 px-1 w-[1%] whitespace-nowrap">
          <EditableCell
            transaction={transaction}
            field="status"
            isEditing={isEditing('status')}
            onEdit={onCellEdit}
            onBulkEdit={onBulkEdit}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
            isSaving={isSaving}
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
            isSaving={isSaving}
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
            isSaving={isSaving}
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
              isSaving={isSaving}
            />
          </div>
        </td>
        <td className="py-3 px-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <EditableCell
              transaction={transaction}
              field="excluded"
              isEditing={isEditing('excluded')}
              onEdit={onCellEdit}
              onBulkEdit={onBulkEdit}
              onStartEdit={onStartEdit}
              onStopEdit={onStopEdit}
              isSaving={isSaving}
            />
          </div>
        </td>
        <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${transaction.budget_month ? 'text-amber-600' : 'text-muted-foreground'} hover:text-amber-700 transition-colors h-8 w-8 p-0`}
                  title={`Set Budget Period (${transaction.budget_month ? formatBudgetMonth(transaction.budget_month) : 'Not Set'})`}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 shadow-xl border-amber-100 bg-white" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Budget Period
                    </h4>
                    {transaction.budget_month && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        {formatBudgetMonth(transaction.budget_month)}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Select Month</label>
                    <Select
                      value={transaction.budget_month || ''}
                      onValueChange={(val) => {
                        const date = parseISO(val);
                        onBulkEdit(transaction.id, {
                          budget_month: val,
                          budget_year: date.getFullYear()
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Chose month..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 36 }, (_, i) => {
                          const date = addMonths(startOfMonth(new Date()), i - 12);
                          return (
                            <SelectItem key={i} value={format(date, 'yyyy-MM-01')}>
                              {format(date, 'MMM yy')}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px] text-slate-400 hover:text-rose-500"
                    onClick={() => {
                      onBulkEdit(transaction.id, { budget_month: null, budget_year: null });
                    }}
                  >
                    Clear Budget Period
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {!transaction.parent_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSplit(transaction)}
                className="text-muted-foreground hover:text-blue-600 transition-colors h-8 w-8 p-0"
                title="Split / Itemize Transaction"
              >
                <Split className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCellEdit(transaction.id, 'status', 'Complete')}
              className="text-muted-foreground hover:text-emerald-600 transition-colors h-8 w-8 p-0"
              title="Confirm / Mark Complete"
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </td>
      </tr >
    </>
  );
}));
