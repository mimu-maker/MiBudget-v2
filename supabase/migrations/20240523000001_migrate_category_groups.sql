-- Populate category_group for existing data

-- Set Income
UPDATE categories 
SET category_group = 'income' 
WHERE name = 'Income';

-- Set Special
UPDATE categories 
SET category_group = 'special' 
WHERE name = 'Special';

-- Set defaults (Expense)
UPDATE categories 
SET category_group = 'expenditure' 
WHERE category_group IS NULL;
