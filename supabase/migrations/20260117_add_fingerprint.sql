-- Add fingerprint and merchant columns to transactions if they don't exist
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS merchant TEXT DEFAULT '' NOT NULL,
ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Create a unique constraint on fingerprint to prevent double imports
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_fingerprint_unique') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT transactions_fingerprint_unique UNIQUE (fingerprint);
    END IF;
END $$;

-- Enable RLS and add wide-open policies for development
-- (In production, these should be tied to auth.uid())
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public for dev" ON public.transactions;
CREATE POLICY "Public for dev" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.merchant_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public for dev" ON public.merchant_rules;
CREATE POLICY "Public for dev" ON public.merchant_rules FOR ALL USING (true) WITH CHECK (true);
