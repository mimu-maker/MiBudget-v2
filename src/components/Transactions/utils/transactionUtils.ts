
import { Transaction } from '../hooks/useTransactionTable';

export const filterTransactions = (transactions: Transaction[], filters: Record<string, any>) => {
  // Hide Excluded by default unless explicitly filtered
  const hasStatusFilter = filters.status && filters.status.length > 0 && filters.status !== 'all';

  return transactions.filter(transaction => {

    return Object.entries(filters).every(([field, filterValue]) => {
      if (filterValue === undefined || filterValue === null || filterValue === '') return true;
      if (typeof filterValue === 'string' && filterValue === 'all') return true;
      if (Array.isArray(filterValue) && filterValue.length === 0) return true;

      const transactionValue = transaction[field as keyof Transaction];

      // Date Filtering
      if (field === 'date') {
        if (filterValue.type === 'month') {
          return new Date(transaction.date).getMonth() === parseInt(filterValue.value) - 1;
        } else if (filterValue.type === 'week') {
          const date = new Date(transaction.date);
          const week = Math.ceil(date.getDate() / 7);
          return week === parseInt(filterValue.value);
        } else if (filterValue.type === 'year') {
          return new Date(transaction.date).getFullYear() === parseInt(filterValue.value);
        } else if (filterValue.type === 'date') {
          return transaction.date === filterValue.value;
        } else if (filterValue.type === 'range' && filterValue.value?.from) {
          const txDate = new Date(transaction.date);
          const from = new Date(filterValue.value.from);
          // Set to start of day
          from.setHours(0, 0, 0, 0);

          if (!filterValue.value.to) {
            return txDate >= from;
          }

          const to = new Date(filterValue.value.to);
          // Set to end of day
          to.setHours(23, 59, 59, 999);

          return txDate >= from && txDate <= to;
        }
      }

      // Numeric Filtering
      if (field === 'amount' && filterValue?.type === 'number') {
        const amount = transaction.amount;
        const filterAmount = parseFloat(filterValue.value);
        if (isNaN(filterAmount)) return true;

        switch (filterValue.operator) {
          case '=': return amount === filterAmount;
          case '!=': return amount !== filterAmount;
          case '>': return amount > filterAmount;
          case '>=': return amount >= filterAmount;
          case '<': return amount < filterAmount;
          case '<=': return amount <= filterAmount;
          default: return true;
        }
      }

      // Multi-select (Array) Filtering
      if (Array.isArray(filterValue)) {
        return filterValue.includes(transactionValue);
      }

      // Custom Resolution Filtering
      if (field === 'resolution') {
        if (filterValue === 'unresolved') {
          return transaction.status !== 'Complete' && !transaction.is_resolved;
        }
        if (filterValue === 'resolved') {
          return transaction.status === 'Complete' || transaction.is_resolved;
        }
      }

      // Boolean Filtering
      if (typeof transactionValue === 'boolean') {
        if (String(filterValue) === 'true') return transactionValue === true;
        if (String(filterValue) === 'false') return transactionValue === false;
      }

      // String Search (Default)
      return String(transactionValue).toLowerCase().includes(String(filterValue).toLowerCase());
    });
  });
};

export const sortTransactions = (transactions: Transaction[], sortBy: keyof Transaction, sortOrder: 'asc' | 'desc') => {
  return [...transactions].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (sortBy === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'amount') {
      return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    } else {
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortOrder === 'asc' ? comparison : -comparison;
    }
  });
};

export const getStatusBadgeVariant = (status: string): any => {
  if (status === 'Complete') return 'success';
  if (status.startsWith('Pending')) return 'warning';
  if (status === 'Reconciled' || status.startsWith('Reconciled:')) return 'success';
  return 'outline';
};

export const getBudgetBadgeVariant = (budget: string): any => {
  switch (budget) {
    case 'Budgeted': return 'success';
    case 'Special': return 'premium';
    case 'Klintemarken': return 'info';
    case 'Exclude': return 'destructive';
    default: return 'outline';
  }
};
