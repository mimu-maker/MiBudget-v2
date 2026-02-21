-- Refine Triage & Budgeting Schema Enhancement
BEGIN;

-- 1. Add budget_year to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS budget_year integer;

-- 2. Add raw merchant name and automation fields to merchant_rules
ALTER TABLE public.merchant_rules
ADD COLUMN IF NOT EXISTS merchant_name text,
ADD COLUMN IF NOT EXISTS auto_recurring text DEFAULT 'N/A',
ADD COLUMN IF NOT EXISTS auto_planned boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_verify boolean DEFAULT true;

-- 3. Backfill budget_year from date for existing transactions
UPDATE public.transactions
SET budget_year = EXTRACT(YEAR FROM date::date)
WHERE budget_year IS NULL AND date IS NOT NULL;

COMMIT;
