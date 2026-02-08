-- 1. Correct the 'Special' category group assignment so it appears in Slush Fund
UPDATE categories 
SET category_group = 'special' 
WHERE name = 'Special';

-- 2. Nullify transactions assigned to 'General' before we delete the category
-- Also nullify any other invalid categories found
UPDATE transactions
SET category = NULL,
    sub_category = NULL
WHERE category = 'General'
   OR category NOT IN (SELECT name FROM categories);

-- 3. Delete the 'General' category from master table
DELETE FROM categories WHERE name = 'General';
