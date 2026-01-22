-- 2025 Budget Import - SIMPLE STEP-BY-STEP VERSION
-- Run each step separately to identify any issues

-- STEP 1: Test user profile exists
SELECT '=== CHECKING USER PROFILE ===' as status;
SELECT id, user_id, email FROM public.user_profiles 
WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06';

-- STEP 2: Create the budget (should work if user profile exists)
SELECT '=== CREATING BUDGET ===' as status;
INSERT INTO public.budgets (user_id, name, year, budget_type, start_date, is_active)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Primary 2025', 2025, 'primary', '2025-01-01', TRUE)
RETURNING id as budget_2025_id;

-- STEP 3: Verify budget created
SELECT '=== BUDGET CREATED ===' as status;
SELECT id, user_id, name, year FROM public.budgets 
WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025';

-- STEP 4: Test creating one category
SELECT '=== TESTING ONE CATEGORY ===' as status;
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Housing', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as test_category_id;

-- STEP 5: Verify category created
SELECT '=== CATEGORY CREATED ===' as status;
SELECT id, user_id, name FROM public.categories 
WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Housing';

-- If this works, then the full import should work. Stop here and test first.
