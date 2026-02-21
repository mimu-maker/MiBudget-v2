-- Fix budgets table schema to match client expectations
BEGIN;

-- Ensure year column exists (already added by previous migration)
-- Ensure budget_type includes 'unified' (already added by previous migration)

-- Update any existing budgets without year to current year
UPDATE public.budgets 
SET year = EXTRACT(YEAR FROM CURRENT_DATE) 
WHERE year IS NULL;

COMMIT;
