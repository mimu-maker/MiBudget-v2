-- Debug budget_sub_categories table structure and data
-- Run this in Supabase SQL Editor

-- Check if table exists and its structure
SELECT '=== TABLE STRUCTURE ===' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'budget_sub_categories' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any foreign key constraints
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as status;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'budget_sub_categories';

-- Check sample data
SELECT '=== SAMPLE DATA ===' as status;
SELECT * FROM public.budget_sub_categories LIMIT 5;

-- Check if the related tables exist
SELECT '=== RELATED TABLES ===' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sub_categories', 'categories', 'budgets')
ORDER BY table_name;
