-- Check the actual structure of budget-related tables
SELECT '=== BUDGET_CATEGORY_LIMITS STRUCTURE ===' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'budget_category_limits' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== BUDGET_SUB_CATEGORIES STRUCTURE ===' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'budget_sub_categories' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== SAMPLE BUDGET_CATEGORY_LIMITS DATA ===' as status;
SELECT * FROM public.budget_category_limits LIMIT 3;

SELECT '=== SAMPLE BUDGET_SUB_CATEGORIES DATA ===' as status;
SELECT * FROM public.budget_sub_categories LIMIT 3;
