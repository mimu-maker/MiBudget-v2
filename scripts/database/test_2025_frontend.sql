-- Test: Check if frontend is fetching 2025 budget data correctly
-- Run this in Supabase SQL Editor

-- Test 1: Check if 2025 budget exists
SELECT '=== TESTING 2025 BUDGET EXISTS ===' as status;
SELECT id, name, year FROM public.budgets 
WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND year = 2025;

-- Test 2: Check if budget limits exist for 2025
SELECT '=== TESTING 2025 BUDGET LIMITS ===' as status;
SELECT COUNT(*) as limit_count 
FROM public.budget_category_limits bcl
JOIN public.budgets b ON bcl.budget_id = b.id 
WHERE b.year = 2025;

-- Test 3: Check if categories exist for user
SELECT '=== TESTING CATEGORIES ===' as status;
SELECT COUNT(*) as category_count 
FROM public.categories 
WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424';

-- Test 4: Check if sub-categories exist for 2025
SELECT '=== TESTING SUB-CATEGORIES ===' as status;
SELECT COUNT(*) as sub_category_count 
FROM public.sub_categories sc
JOIN public.categories c ON sc.category_id = c.id 
WHERE c.user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424';

-- Test 5: Check budget_sub_categories activation
SELECT '=== TESTING BUDGET SUB-CATEGORIES ===' as status;
SELECT COUNT(*) as activation_count 
FROM public.budget_sub_categories 
WHERE budget_id = (SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND year = 2025);
