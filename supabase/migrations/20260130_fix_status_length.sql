-- Increase status column size to support long status names like 'Pending Reconciliation'
ALTER TABLE public.transactions ALTER COLUMN status TYPE text;
