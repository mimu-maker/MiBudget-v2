-- Complete script to fix sub-category budget limits
-- This does everything in the correct order

-- Step 1: Add sub_category_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budget_category_limits' 
        AND column_name = 'sub_category_id'
    ) THEN
        ALTER TABLE public.budget_category_limits 
        ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 2: Drop existing unique constraint (if it exists)
ALTER TABLE public.budget_category_limits 
DROP CONSTRAINT IF EXISTS budget_category_limits_budget_id_category_id_key;

-- Step 3: Add new unique constraint that includes sub_category_id (allowing NULL)
ALTER TABLE public.budget_category_limits 
ADD CONSTRAINT budget_category_limits_budget_id_category_id_sub_category_id_key 
UNIQUE(budget_id, category_id, sub_category_id);

-- Step 4: Populate sub-category budget limits
INSERT INTO public.budget_category_limits (budget_id, category_id, sub_category_id, limit_amount, is_percentage)
SELECT 
    b.id as budget_id,
    c.id as category_id,
    sc.id as sub_category_id,
    bcl.limit_amount as limit_amount,
    FALSE as is_percentage
FROM public.budgets b
JOIN public.categories c ON c.user_id = b.user_id AND c.category_group != 'income'
JOIN public.sub_categories sc ON sc.category_id = c.id
LEFT JOIN public.budget_category_limits bcl ON bcl.budget_id = b.id AND bcl.category_id = c.id AND bcl.sub_category_id IS NULL
WHERE b.budget_type = 'unified' 
AND b.year = 2025
AND sc.id IS NOT NULL
AND bcl.limit_amount > 0
ON CONFLICT (budget_id, category_id, sub_category_id) DO NOTHING;
