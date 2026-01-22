-- Emergency fix: Temporarily disable RLS to get it working
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS temporarily
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_category_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_sub_categories DISABLE ROW LEVEL SECURITY;

-- Step 2: Test if we can now access the profile
SELECT '=== TEST WITH RLS DISABLED ===' as status;
SELECT COUNT(*) as profile_count FROM public.user_profiles WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06';

-- Step 3: Show the actual profile
SELECT '=== SHOW PROFILE ===' as status;
SELECT * FROM public.user_profiles WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06';

-- Step 4: Test budget access
SELECT '=== TEST BUDGET ACCESS ===' as status;
SELECT COUNT(*) as budget_count FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424';
