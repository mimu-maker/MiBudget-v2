-- Check transaction constraints with correct column names
SELECT '=== TRANSACTION TABLE CONSTRAINTS ===' as status;
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'public.transactions'::regclass 
AND contype IN ('u', 'p', 'f')
ORDER BY conname;

-- Check indexes with correct column names
SELECT '=== TRANSACTION INDEXES ===' as status;
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'transactions' 
ORDER BY indexname;

-- Check table structure
SELECT '=== TRANSACTION TABLE STRUCTURE ===' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
