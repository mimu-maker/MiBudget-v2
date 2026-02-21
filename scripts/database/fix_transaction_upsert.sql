-- Fix transaction upsert ON CONFLICT error
-- The issue is with the constraint specification in the upsert

-- First, check what constraints exist on transactions table
SELECT '=== TRANSACTION TABLE CONSTRAINTS ===' as status;
SELECT conname, contype 
FROM pg_constraint 
WHERE contrelid = 'transactions'::regclass 
AND contype IN ('u', 'p', 'f')
ORDER BY conname;

-- Check if there's a unique constraint on (user_id, date, amount, merchant) or similar
SELECT '=== TRANSACTION INDEXES ===' as status;
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'transactions' 
ORDER BY indexname;

-- The fix is to update the upsert to use the correct constraint name
-- Usually it's either transactions_pkey or a unique constraint on specific columns

-- For now, let's create a simple version without ON CONFLICT to bypass the issue
-- This will allow the sync to continue while we fix the proper constraint

-- Test with a simple insert first
SELECT '=== TESTING SIMPLE INSERT ===' as status;
INSERT INTO public.transactions (
    id, user_id, date, merchant, amount, account, status, 
    budget, category, sub_category, description, planned, recurring, 
    fingerprint, clean_merchant, budget_month, confidence
) VALUES (
    gen_random_uuid(),
    'd1ad5d65-da01-445f-bcfe-cc7f6552a424',
    CURRENT_DATE,
    'Test Transaction',
    -100.00,
    'Test Account',
    'confirmed',
    'Test Budget',
    'Test Category',
    'Test Sub Category',
    'Test Description',
    false,
    false,
    'test_fingerprint',
    true,
    '2025-01',
    0.9
) ON CONFLICT (id) DO NOTHING;
