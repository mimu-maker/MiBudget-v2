-- Nullify transactions with categories that don't exist in the master categories table
-- This ensures strict referential integrity for dropdowns and reporting

UPDATE transactions
SET category = NULL,
    sub_category = NULL
WHERE category IS NOT NULL
  AND category NOT IN (SELECT name FROM categories);
