-- Script to setup hierarchical categories for existing users
-- Run this script in Supabase SQL Editor after applying the migration

-- 1. First, ensure all existing categories have proper category_group values
UPDATE public.categories 
SET category_group = CASE 
    WHEN name ILIKE '%income%' THEN 'income'
    WHEN name ILIKE '%housing%' OR name ILIKE '%rent%' OR name ILIKE '%mortgage%' OR name ILIKE '%utilities%' OR name ILIKE '%food%' OR name ILIKE '%transportation%' OR name ILIKE '%healthcare%' OR name ILIKE '%personal%' OR name ILIKE '%savings%' THEN 'expenditure'
    WHEN name ILIKE '%klintemarken%' THEN 'klintemarken'
    WHEN name ILIKE '%special%' THEN 'special'
    ELSE 'expenditure'
END
WHERE category_group = 'expenditure' OR category_group IS NULL;

-- 2. Initialize hierarchical categories for all existing users
SELECT 'Initializing hierarchical categories for all users...' as status;

-- Insert default categories for all users who don't have them yet
INSERT INTO public.categories (user_id, name, category_group, display_order, is_system)
SELECT 
    up.id as user_id,
    cat.name,
    cat.category_group,
    cat.display_order,
    TRUE as is_system
FROM public.user_profiles up
CROSS JOIN (VALUES 
    ('Income', 'income', 1),
    ('Primary Income', 'income', 2),
    ('Housing', 'expenditure', 1),
    ('Utilities', 'expenditure', 2),
    ('Food', 'expenditure', 3),
    ('Transportation', 'expenditure', 4),
    ('Healthcare', 'expenditure', 5),
    ('Personal', 'expenditure', 6),
    ('Savings', 'expenditure', 7),
    ('Klintemarken', 'klintemarken', 1),
    ('Special', 'special', 1)
) AS cat(name, category_group, display_order)
LEFT JOIN public.categories existing ON existing.user_id = up.id AND existing.name = cat.name
WHERE existing.id IS NULL
ON CONFLICT (user_id, name) DO NOTHING;

-- 3. Initialize Klintemarken sub-categories
INSERT INTO public.sub_categories (category_id, name, display_order)
SELECT 
    c.id as category_id,
    sub.name,
    sub.display_order
FROM public.categories c
CROSS JOIN (VALUES 
    ('Income - Rent', 1),
    ('Expense - Mortgage', 2),
    ('Expense - Property Tax', 3),
    ('Expense - Insurance', 4),
    ('Expense - Maintenance', 5),
    ('Expense - Utilities', 6)
) AS sub(name, display_order)
LEFT JOIN public.sub_categories existing ON existing.category_id = c.id AND existing.name = sub.name
WHERE c.name = 'Klintemarken' AND existing.id IS NULL
ON CONFLICT (category_id, name) DO NOTHING;

-- 4. Initialize Special sub-categories  
INSERT INTO public.sub_categories (category_id, name, display_order)
SELECT 
    c.id as category_id,
    sub.name,
    sub.display_order
FROM public.categories c
CROSS JOIN (VALUES 
    ('Dog', 1),
    ('Health', 2),
    ('Household', 3),
    ('Income', 4),
    ('Operation Mamba', 5),
    ('Project Sønderborg', 6),
    ('Special Celebration', 7)
) AS sub(name, display_order)
LEFT JOIN public.sub_categories existing ON existing.category_id = c.id AND existing.name = sub.name
WHERE c.name = 'Special' AND existing.id IS NULL
ON CONFLICT (category_id, name) DO NOTHING;

-- 5. Create unified budgets for users who don't have them
INSERT INTO budgets (user_id, name, start_date, budget_type, period_type)
SELECT 
    id as user_id, 
    'Unified Budget' as name,
    CURRENT_DATE as start_date,
    'unified' as budget_type,
    'yearly' as period_type
FROM user_profiles 
WHERE id NOT IN (
    SELECT DISTINCT user_id FROM budgets WHERE budget_type = 'unified'
);

-- 3. Verification queries
SELECT 'Setup completed!' as status;
SELECT 
    ug.name as user_group,
    c.category_group,
    COUNT(*) as category_count
FROM categories c
JOIN user_profiles ug ON c.user_id = ug.id
WHERE c.category_group IS NOT NULL
GROUP BY ug.name, c.category_group
ORDER BY ug.name, c.category_group;

-- 4. Show created sub-categories
SELECT 
    c.name as category_name,
    c.category_group,
    sc.name as sub_category_name,
    sc.display_order
FROM categories c
JOIN sub_categories sc ON sc.category_id = c.id
WHERE c.category_group IN ('klintemarken', 'special')
ORDER BY c.category_group, c.display_order, sc.display_order;
