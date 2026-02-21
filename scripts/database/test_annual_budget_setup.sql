-- Test Script for Annual Budget Configuration
-- Run this script to verify the annual budget setup works correctly

-- 1. Test that budgets table has year column
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'budgets' AND column_name = 'year';

-- 2. Test that transactions table has budget_year column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND column_name = 'budget_year';

-- 3. Test that budget_sub_categories table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'budget_sub_categories' 
ORDER BY ordinal_position;

-- 4. Test unique constraint on budgets table
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'budgets' AND constraint_type = 'UNIQUE';

-- 5. Test triggers exist
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE trigger_name IN (
    'set_transaction_budget_year_trigger', 
    'activate_sub_category_trigger'
);

-- 6. Test functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
    'set_transaction_budget_year',
    'activate_sub_category_for_budget_year',
    'get_active_sub_categories',
    'carry_forward_sub_categories'
);

-- 7. Test RLS policies exist
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('budget_sub_categories');

-- 8. Test indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('transactions', 'budget_sub_categories')
AND indexname LIKE 'idx_%';

-- 9. Sample data test (run after import)
-- Test that we can query active sub-categories for a budget
-- SELECT * FROM get_active_sub_categories('your-budget-id-here');

-- 10. Test budget year auto-population
-- This would be tested by inserting a transaction and checking budget_year
-- INSERT INTO transactions (date, amount, description, category, sub_category, user_id)
-- VALUES ('2025-03-15', 50.00, 'Test transaction', 'Auto & Transport', 'Gas & Fuel', 'your-user-id');
-- 
-- SELECT budget_year FROM transactions WHERE description = 'Test transaction';

-- Verification queries
SELECT 'Annual budget configuration test completed' as status;
