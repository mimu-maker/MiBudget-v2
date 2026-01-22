-- 2025 Budget Data Import Script - FINAL VERSION
-- Uses auth.users ID directly for budget creation
-- Run this in Supabase SQL Editor to import your 2025 budget data

-- Step 1: Create the 2025 Primary Budget (using auth.users ID directly)
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
    (housing_category_id, 'Solbakken - BoligLån'),
    (housing_category_id, 'Solbakken - Priority Loan'),
    (housing_category_id, 'Insurance')
ON CONFLICT (category_id, name) DO NOTHING;

-- 2. Utilities (Budget: 4,450 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Utilities', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as utilities_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    (utilities_category_id, 'Electricity'),
    (utilities_category_id, 'Heating'),
    (utilities_category_id, 'Water&Waste')
ON CONFLICT (category_id, name) DO NOTHING;

-- 3. Food (Budget: 12,500 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Food', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as food_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    (food_category_id, 'Groceries'),
    (food_category_id, 'Takeaway')
ON CONFLICT (category_id, name) DO NOTHING;

-- 4. Household (Budget: 9,500 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Household', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as household_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    (household_category_id, 'Allowance'),
    (household_category_id, 'Insurance'),
    (household_category_id, 'Subscription/Fees'),
    (household_category_id, 'General'),
    (household_category_id, 'Gifts'),
    (household_category_id, 'Pets')
ON CONFLICT (category_id, name) DO NOTHING;

-- 5. Transport (Budget: 5,481 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Transport', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as transport_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    (transport_category_id, 'Tesla'),
    (transport_category_id, 'Tesla Insurance'),
    (transport_category_id, 'Golf'),
    (transport_category_id, 'Golf Insurance'),
    (transport_category_id, 'Charging'),
    (transport_category_id, 'Fees & Maintenance')
ON CONFLICT (category_id, name) DO NOTHING;

-- 6. SID (Budget: 2,701 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'SID', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as sid_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    (sid_category_id, 'Investment'),
    (sid_category_id, 'Biz Xpns'),
    (sid_category_id, 'Summerhouse')
ON CONFLICT (category_id, name) DO NOTHING;

-- 7. FUN (Budget: 7,373 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'FUN', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as fun_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    (fun_category_id, 'Vacation'),
    (fun_category_id, 'Leisure'),
    (fun_category_id, 'Celebration')
ON CONFLICT (category_id, name) DO NOTHING;

-- 8. Kids (Budget: 5,810 kr)
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'Kids', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as kids_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    (kids_category_id, 'Tuition'),
    (kids_category_id, 'Clothing/Equipment'),
    (kids_category_id, 'Pocket Money (ARIA)'),
    (kids_category_id, 'Pocket Money (MAGNUS)'),
    (kids_category_id, 'General'),
    (kids_category_id, 'Savings')
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
    (uncategorized_category_id, 'Uncategorized')
ON CONFLICT (category_id, name) DO NOTHING;

-- Step 3: Create Budget Category Limits for 2025
INSERT INTO public.budget_category_limits (budget_id, category_id, limit_amount, alert_threshold)
SELECT budget_2025_id, category_id, limit_amount, 80.00 FROM (
    VALUES 
        -- Housing (9,810 kr)
        (budget_2025_id, housing_category_id, 9810.00),
        -- Utilities (4,450 kr)
        (budget_2025_id, utilities_category_id, 4450.00),
        -- Food (12,500 kr)
        (budget_2025_id, food_category_id, 12500.00),
        -- Household (9,500 kr)
        (budget_2025_id, household_category_id, 9500.00),
        -- Transport (5,481 kr)
        (budget_2025_id, transport_category_id, 5481.00),
        -- SID (2,701 kr)
        (budget_2025_id, sid_category_id, 2701.00),
        -- FUN (7,373 kr)
        (budget_2025_id, fun_category_id, 7373.00),
        -- Kids (5,810 kr)
        (budget_2025_id, kids_category_id, 5810.00),
        -- Special (5,000 kr)
        (budget_2025_id, special_category_id, 5000.00),
        -- Uncategorized (0 kr)
        (budget_2025_id, uncategorized_category_id, 0.00)
) AS v(budget_id, category_id, limit_amount, alert_threshold)
ON CONFLICT (budget_id, category_id) DO NOTHING;

-- Step 4: Activate all sub-categories for 2025 budget
INSERT INTO public.budget_sub_categories (budget_id, sub_category_id, is_active)
SELECT 
    budget_2025_id,
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
SELECT COUNT(*) as budget_limits_created FROM public.budget_category_limits WHERE budget_id = budget_2025_id;
SELECT COUNT(*) as budget_sub_categories_activated FROM public.budget_sub_categories WHERE budget_id = budget_2025_id;
