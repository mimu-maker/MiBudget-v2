-- Ensure unique constraint on fingerprint exists for transactions upsert
BEGIN;

-- Drop constraint if it exists with wrong name
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_fingerprint_key;

-- Add the correct unique constraint
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_fingerprint_unique UNIQUE (fingerprint);

COMMIT;
