-- Script to fix unique constraint for budget_category_limits
-- This will update the unique constraint to include sub_category_id

-- Drop existing unique constraint
ALTER TABLE public.budget_category_limits 
DROP CONSTRAINT IF EXISTS budget_category_limits_budget_id_category_id_key;

-- Add new unique constraint that includes sub_category_id
ALTER TABLE public.budget_category_limits 
ADD CONSTRAINT budget_category_limits_budget_id_category_id_sub_category_id_key 
UNIQUE(budget_id, category_id, sub_category_id);
