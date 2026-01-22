-- 2025 Budget Data Import Script - CORRECTED
-- Run this in Supabase SQL Editor to import your 2025 budget data
-- Based on the 10 categories from your image

-- Step 1: Create the 2025 Primary Budget
INSERT INTO public.budgets (user_id, name, year, budget_type, start_date, is_active)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Primary 2025', 2025, 'primary', '2025-01-01', TRUE)
ON CONFLICT (user_id, name, budget_type, year) DO NOTHING
RETURNING id as budget_2025_id;

-- Step 2: Create Categories and Sub-categories with Budget Limits

-- 1. Housing (Budget: 9,810 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Housing', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as housing_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Housing' LIMIT 1), 'Solbakken - BoligLån'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Housing' LIMIT 1), 'Solbakken - Priority Loan'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Housing' LIMIT 1), 'Insurance')
ON CONFLICT (category_id, name) DO NOTHING;

-- 2. Utilities (Budget: 4,450 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Utilities', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as utilities_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Utilities' LIMIT 1), 'Electricity'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Utilities' LIMIT 1), 'Heating'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Utilities' LIMIT 1), 'Water&Waste')
ON CONFLICT (category_id, name) DO NOTHING;

-- 3. Food (Budget: 12,500 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Food', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as food_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Food' LIMIT 1), 'Groceries'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Food' LIMIT 1), 'Takeaway')
ON CONFLICT (category_id, name) DO NOTHING;

-- 4. Household (Budget: 9,500 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Household', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as household_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Household' LIMIT 1), 'Allowance'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Household' LIMIT 1), 'Insurance'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Household' LIMIT 1), 'Subscription/Fees'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Household' LIMIT 1), 'General'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Household' LIMIT 1), 'Gifts'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Household' LIMIT 1), 'Pets')
ON CONFLICT (category_id, name) DO NOTHING;

-- 5. Transport (Budget: 5,481 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Transport', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as transport_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Transport' LIMIT 1), 'Tesla'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Transport' LIMIT 1), 'Tesla Insurance'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Transport' LIMIT 1), 'Golf'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Transport' LIMIT 1), 'Golf Insurance'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Transport' LIMIT 1), 'Charging'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Transport' LIMIT 1), 'Fees & Maintenance')
ON CONFLICT (category_id, name) DO NOTHING;

-- 6. SID (Budget: 2,701 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'SID', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as sid_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'SID' LIMIT 1), 'Investment'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'SID' LIMIT 1), 'Biz Xpns'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'SID' LIMIT 1), 'Summerhouse')
ON CONFLICT (category_id, name) DO NOTHING;

-- 7. FUN (Budget: 7,373 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'FUN', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as fun_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'FUN' LIMIT 1), 'Vacation'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'FUN' LIMIT 1), 'Leisure'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'FUN' LIMIT 1), 'Celebration')
ON CONFLICT (category_id, name) DO NOTHING;

-- 8. Kids (Budget: 5,810 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Kids', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as kids_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Kids' LIMIT 1), 'Tuition'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Kids' LIMIT 1), 'Clothing/Equipment'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Kids' LIMIT 1), 'Pocket Money (ARIA)'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Kids' LIMIT 1), 'Pocket Money (MAGNUS)'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Kids' LIMIT 1), 'General'),
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Kids' LIMIT 1), 'Savings')
ON CONFLICT (category_id, name) DO NOTHING;

-- 9. Special (Budget: 5,000 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Special', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as special_category_id;

-- 10. Uncategorized (Budget: 0 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Uncategorized', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as uncategorized_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Uncategorized' LIMIT 1), 'Uncategorized')
ON CONFLICT (category_id, name) DO NOTHING;

-- Step 3: Create Budget Category Limits for 2025
INSERT INTO public.budget_category_limits (budget_id, category_id, limit_amount, alert_threshold)
VALUES 
    -- Housing (9,810 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Housing' LIMIT 1), 9810.00, 80.00),
    
    -- Utilities (4,450 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Utilities' LIMIT 1), 4450.00, 80.00),
    
    -- Food (12,500 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Food' LIMIT 1), 12500.00, 80.00),
    
    -- Household (9,500 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Household' LIMIT 1), 9500.00, 80.00),
    
    -- Transport (5,481 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Transport' LIMIT 1), 5481.00, 80.00),
    
    -- SID (2,701 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'SID' LIMIT 1), 2701.00, 80.00),
    
    -- FUN (7,373 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'FUN' LIMIT 1), 7373.00, 80.00),
    
    -- Kids (5,810 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Kids' LIMIT 1), 5810.00, 80.00),
    
    -- Special (5,000 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Special' LIMIT 1), 5000.00, 80.00),
    
    -- Uncategorized (0 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Uncategorized' LIMIT 1), 0.00, 80.00)
ON CONFLICT (budget_id, category_id) DO NOTHING;

-- Step 4: Activate all sub-categories for 2025 budget
INSERT INTO public.budget_sub_categories (budget_id, sub_category_id, is_active)
SELECT 
    (SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1),
    sc.id,
    TRUE
FROM public.sub_categories sc
WHERE sc.category_id IN (
    SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06'
)
ON CONFLICT (budget_id, sub_category_id) DO NOTHING;

-- Verification queries
SELECT '2025 Budget import completed successfully' as status;
SELECT COUNT(*) as categories_created FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06';
SELECT COUNT(*) as sub_categories_created FROM public.sub_categories WHERE category_id IN (
    SELECT id FROM public.categories WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06'
);
SELECT COUNT(*) as budget_limits_created FROM public.budget_category_limits WHERE budget_id = (
    SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1
);
SELECT COUNT(*) as budget_sub_categories_activated FROM public.budget_sub_categories WHERE budget_id = (
    SELECT id FROM public.budgets WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06' AND name = 'Primary 2025' AND year = 2025 LIMIT 1
);
