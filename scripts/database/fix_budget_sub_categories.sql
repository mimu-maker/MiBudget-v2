-- Fix budget_sub_categories table structure and relationships
-- Run this in Supabase SQL Editor

-- First, check current table structure
SELECT '=== CURRENT BUDGET_SUB_CATEGORIES STRUCTURE ===' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'budget_sub_categories' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if sub_categories table exists
SELECT '=== SUB_CATEGORIES TABLE ===' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sub_categories' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if categories table exists  
SELECT '=== CATEGORIES TABLE ===' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'categories' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- If budget_sub_categories doesn't exist or is malformed, recreate it
-- Drop and recreate with correct structure
DROP TABLE IF EXISTS public.budget_sub_categories CASCADE;

CREATE TABLE public.budget_sub_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    sub_category_id uuid NOT NULL REFERENCES public.sub_categories(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    limit_amount decimal(12,2) NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_sub_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view their own budget sub-categories" ON public.budget_sub_categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.budgets 
            WHERE budgets.id = budget_sub_categories.budget_id 
            AND budgets.user_id = auth.uid()
        )
    );

-- Verify the structure
SELECT '=== NEW STRUCTURE VERIFICATION ===' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'budget_sub_categories' 
AND table_schema = 'public'
ORDER BY ordinal_position;
