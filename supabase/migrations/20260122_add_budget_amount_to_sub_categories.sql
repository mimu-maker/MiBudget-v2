-- Add budget amount tracking to sub_categories so UI mutations can persist
BEGIN;

ALTER TABLE public.sub_categories
ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(12,2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.sub_categories.budget_amount IS 'Monthly budget allocation for this sub-category';

COMMIT;
