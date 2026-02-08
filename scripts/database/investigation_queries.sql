-- 1. INVESTIGATION: Find all orphaned categories in transactions
-- These are values in the 'category' column that don't exist in the 'categories' table
SELECT DISTINCT category 
FROM transactions 
WHERE category IS NOT NULL 
  AND category NOT IN (SELECT name FROM categories)
ORDER BY category;

-- 2. INVESTIGATION: Find orphaned categories in source rules
SELECT DISTINCT auto_category 
FROM source_rules 
WHERE auto_category IS NOT NULL 
  AND auto_category NOT IN (SELECT name FROM categories)
ORDER BY auto_category;

-- 3. FIX: Rename "FUN" to "Personal & Lifestyle"
-- WARNING: Confirm the new name is 'Personal & Lifestyle' before running
-- This updates transactions
UPDATE transactions
SET category = 'Personal & Lifestyle'
WHERE category = 'FUN';

-- This updates source rules
UPDATE source_rules
SET auto_category = 'Personal & Lifestyle'
WHERE auto_category = 'FUN';

-- 4. VERIFICATION: Ensure no "FUN" remains
SELECT count(*) FROM transactions WHERE category = 'FUN';
SELECT count(*) FROM source_rules WHERE auto_category = 'FUN';
