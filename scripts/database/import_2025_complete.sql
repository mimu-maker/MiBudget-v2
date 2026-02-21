-- 2025 Budget Import - COMPLETE WORKING VERSION
-- This script creates everything in the correct order without variable dependencies

-- Step 1: Create the 2025 Primary Budget
INSERT INTO public.budgets (user_id, name, year, budget_type, start_date, is_active)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Primary 2025', 2025, 'primary', '2025-01-01', TRUE)
ON CONFLICT (user_id, name, budget_type, year) DO NOTHING;

-- Step 2: Create all Categories first (so they exist for sub-categories)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Housing', FALSE),
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Utilities', FALSE),
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Food', FALSE),
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Household', FALSE),
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Transport', FALSE),
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'SID', FALSE),
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'FUN', FALSE),
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Kids', FALSE),
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Special', FALSE),
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Uncategorized', FALSE)
ON CONFLICT (user_id, name) DO NOTHING;

-- Step 3: Create all Sub-categories (now that categories exist)
INSERT INTO public.sub_categories (category_id, name)
VALUES 
    -- Housing sub-categories
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Housing' LIMIT 1), 'Solbakken - BoligLån'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Housing' LIMIT 1), 'Solbakken - Priority Loan'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Housing' LIMIT 1), 'Insurance'),
    
    -- Utilities sub-categories
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Utilities' LIMIT 1), 'Electricity'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Utilities' LIMIT 1), 'Heating'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Utilities' LIMIT 1), 'Water&Waste'),
    
    -- Food sub-categories
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Food' LIMIT 1), 'Groceries'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Food' LIMIT 1), 'Takeaway'),
    
    -- Household sub-categories
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Household' LIMIT 1), 'Allowance'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Household' LIMIT 1), 'Insurance'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Household' LIMIT 1), 'Subscription/Fees'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Household' LIMIT 1), 'General'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Household' LIMIT 1), 'Gifts'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Household' LIMIT 1), 'Pets'),
    
    -- Transport sub-categories
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Transport' LIMIT 1), 'Tesla'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Transport' LIMIT 1), 'Tesla Insurance'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Transport' LIMIT 1), 'Golf'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Transport' LIMIT 1), 'Golf Insurance'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Transport' LIMIT 1), 'Charging'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Transport' LIMIT 1), 'Fees & Maintenance'),
    
    -- SID sub-categories
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'SID' LIMIT 1), 'Investment'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'SID' LIMIT 1), 'Biz Xpns'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'SID' LIMIT 1), 'Summerhouse'),
    
    -- FUN sub-categories
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'FUN' LIMIT 1), 'Vacation'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'FUN' LIMIT 1), 'Leisure'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'FUN' LIMIT 1), 'Celebration'),
    
    -- Kids sub-categories
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Kids' LIMIT 1), 'Tuition'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Kids' LIMIT 1), 'Clothing/Equipment'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Kids' LIMIT 1), 'Pocket Money (ARIA)'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Kids' LIMIT 1), 'Pocket Money (MAGNUS)'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Kids' LIMIT 1), 'General'),
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Kids' LIMIT 1), 'Savings'),
    
    -- Special sub-categories (none, but we'll create the category anyway)
    
    -- Uncategorized sub-category
    ((SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Uncategorized' LIMIT 1), 'Uncategorized')
ON CONFLICT (category_id, name) DO NOTHING;

-- Step 4: Create Budget Category Limits for 2025
INSERT INTO public.budget_category_limits (budget_id, category_id, limit_amount, alert_threshold)
VALUES 
    -- Housing (9,810 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Housing' LIMIT 1), 9810.00, 80.00),
    
    -- Utilities (4,450 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Utilities' LIMIT 1), 4450.00, 80.00),
    
    -- Food (12,500 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Food' LIMIT 1), 12500.00, 80.00),
    
    -- Household (9,500 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Household' LIMIT 1), 9500.00, 80.00),
    
    -- Transport (5,481 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Transport' LIMIT 1), 5481.00, 80.00),
    
    -- SID (2,701 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'SID' LIMIT 1), 2701.00, 80.00),
    
    -- FUN (7,373 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'FUN' LIMIT 1), 7373.00, 80.00),
    
    -- Kids (5,810 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Kids' LIMIT 1), 5810.00, 80.00),
    
    -- Special (5,000 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Special' LIMIT 1), 5000.00, 80.00),
    
    -- Uncategorized (0 kr)
    ((SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Uncategorized' LIMIT 1), 0.00, 80.00)
ON CONFLICT (budget_id, category_id) DO NOTHING;

-- Step 5: Activate all sub-categories for 2025 budget
INSERT INTO public.budget_sub_categories (budget_id, sub_category_id, is_active)
SELECT 
    (SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1),
    sc.id,
    TRUE
FROM public.sub_categories sc
WHERE sc.category_id IN (
    SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424'
)
ON CONFLICT (budget_id, sub_category_id) DO NOTHING;

-- Verification queries
SELECT '2025 Budget import completed successfully' as status;
SELECT COUNT(*) as categories_created FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424';
SELECT COUNT(*) as sub_categories_created FROM public.sub_categories WHERE category_id IN (
    SELECT id FROM public.categories WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424'
);
SELECT COUNT(*) as budget_limits_created FROM public.budget_category_limits WHERE budget_id = (
    SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1
);
SELECT COUNT(*) as budget_sub_categories_activated FROM public.budget_sub_categories WHERE budget_id = (
    SELECT id FROM public.budgets WHERE user_id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424' AND name = 'Primary 2025' AND year = 2025 LIMIT 1
);
