-- 2025 Budget Data Import Script
-- Run this in Supabase SQL Editor to import your 2025 budget data

-- First, let's create a temporary user profile for testing (you can replace this with your actual user)
-- You'll need to replace 'a316d106-5bc5-447a-b594-91dab8814c06' with your actual auth.users.id
-- Get this from your auth.users table or by checking your user profile

-- Step 1: Create the 2025 Primary Budget
INSERT INTO public.budgets (user_id, name, year, budget_type, start_date, is_active)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Primary 2025', 2025, 'primary', '2025-01-01', TRUE)
ON CONFLICT (user_id, name, budget_type, year) DO NOTHING
RETURNING id as budget_2025_id;

-- Step 2: Create Categories and Sub-categories with Budget Limits
-- Auto & Transport
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Auto & Transport', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as auto_transport_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Auto & Transport' LIMIT 1), 'Gas & Fuel'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Auto & Transport' LIMIT 1), 'Parking'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Auto & Transport' LIMIT 1), 'Tesla')
ON CONFLICT (category_id, name) DO NOTHING;

-- Bills & Utilities
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Bills & Utilities', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as bills_utilities_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Bills & Utilities' LIMIT 1), 'Electricity'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Bills & Utilities' LIMIT 1), 'Gas & Water'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Bills & Utilities' LIMIT 1), 'Internet'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Bills & Utilities' LIMIT 1), 'Phone'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Bills & Utilities' LIMIT 1), 'Trash')
ON CONFLICT (category_id, name) DO NOTHING;

-- Business Expenses
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Business Expenses', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as business_expenses_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Business Expenses' LIMIT 1), 'Advertising'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Business Expenses' LIMIT 1), 'Software')
ON CONFLICT (category_id, name) DO NOTHING;

-- Education
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Education', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as education_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Education' LIMIT 1), 'Student Loans'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Education' LIMIT 1), 'Tuition')
ON CONFLICT (category_id, name) DO NOTHING;

-- Entertainment
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Entertainment', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as entertainment_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Entertainment' LIMIT 1), 'Amusement'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Entertainment' LIMIT 1), 'Events'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Entertainment' LIMIT 1), 'Media')
ON CONFLICT (category_id, name) DO NOTHING;

-- Fees & Charges
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Fees & Charges', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as fees_charges_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Fees & Charges' LIMIT 1), 'Bank Fees'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Fees & Charges' LIMIT 1), 'Service Fees')
ON CONFLICT (category_id, name) DO NOTHING;

-- Financial
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Financial', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as financial_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Financial' LIMIT 1), 'Credit Card Payment'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Financial' LIMIT 1), 'Investment'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Financial' LIMIT 1), 'Loan')
ON CONFLICT (category_id, name) DO NOTHING;

-- Food & Dining
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Food & Dining', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as food_dining_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Food & Dining' LIMIT 1), 'Fast Food'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Food & Dining' LIMIT 1), 'Groceries'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Food & Dining' LIMIT 1), 'Restaurants')
ON CONFLICT (category_id, name) DO NOTHING;

-- Gifts & Donations
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Gifts & Donations', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as gifts_donations_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Gifts & Donations' LIMIT 1), 'Charity'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Gifts & Donations' LIMIT 1), 'Gifts')
ON CONFLICT (category_id, name) DO NOTHING;

-- Health & Fitness
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Health & Fitness', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as health_fitness_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Health & Fitness' LIMIT 1), 'Dental'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Health & Fitness' LIMIT 1), 'Doctor'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Health & Fitness' LIMIT 1), 'Gym'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Health & Fitness' LIMIT 1), 'Pharmacy')
ON CONFLICT (category_id, name) DO NOTHING;

-- Home
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Home', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as home_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Home' LIMIT 1), 'Home Improvement'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Home' LIMIT 1), 'Home Services'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Home' LIMIT 1), 'Rent'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Home' LIMIT 1), 'Supplies')
ON CONFLICT (category_id, name) DO NOTHING;

-- Income
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Income', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as income_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Income' LIMIT 1), 'Bonus'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Income' LIMIT 1), 'Paycheck'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Income' LIMIT 1), 'Reimbursement')
ON CONFLICT (category_id, name) DO NOTHING;

-- Insurance
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Insurance', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as insurance_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Insurance' LIMIT 1), 'Auto'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Insurance' LIMIT 1), 'Health'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Insurance' LIMIT 1), 'Life'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Insurance' LIMIT 1), 'Renters')
ON CONFLICT (category_id, name) DO NOTHING;

-- Personal Care
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Personal Care', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as personal_care_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Personal Care' LIMIT 1), 'Clothing'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Personal Care' LIMIT 1), 'Hair'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Personal Care' LIMIT 1), 'Supplies')
ON CONFLICT (category_id, name) DO NOTHING;

-- Pets
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Pets', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as pets_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Pets' LIMIT 1), 'Pet Food & Supplies'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Pets' LIMIT 1), 'Veterinary')
ON CONFLICT (category_id, name) DO NOTHING;

-- Shopping
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Shopping', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as shopping_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Shopping' LIMIT 1), 'Amazon'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Shopping' LIMIT 1), 'Department Stores'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Shopping' LIMIT 1), 'Electronics'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Shopping' LIMIT 1), 'Sporting Goods')
ON CONFLICT (category_id, name) DO NOTHING;

-- Taxes
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Taxes', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as taxes_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Taxes' LIMIT 1), 'Federal Tax'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Taxes' LIMIT 1), 'State Tax'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Taxes' LIMIT 1), 'Property Tax')
ON CONFLICT (category_id, name) DO NOTHING;

-- Travel
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Travel', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as travel_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Travel' LIMIT 1), 'Flights'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Travel' LIMIT 1), 'Hotels'),
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Travel' LIMIT 1), 'Vacation')
ON CONFLICT (category_id, name) DO NOTHING;

-- Uncategorized
INSERT INTO public.categories (user_id, name, is_system)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'Uncategorized', FALSE)
ON CONFLICT (user_id, name) DO NOTHING
RETURNING id as uncategorized_category_id;

INSERT INTO public.sub_categories (category_id, name)
VALUES 
    ((SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Uncategorized' LIMIT 1), 'Uncategorized')
ON CONFLICT (category_id, name) DO NOTHING;

-- Step 3: Create Budget Category Limits for 2025
INSERT INTO public.budget_category_limits (budget_id, category_id, limit_amount, alert_threshold)
VALUES 
    -- Auto & Transport ($850 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Auto & Transport' LIMIT 1), 850.00, 80.00),
    
    -- Bills & Utilities ($420 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Bills & Utilities' LIMIT 1), 420.00, 80.00),
    
    -- Business Expenses ($150 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Business Expenses' LIMIT 1), 150.00, 80.00),
    
    -- Education ($1500 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Education' LIMIT 1), 1500.00, 80.00),
    
    -- Entertainment ($175 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Entertainment' LIMIT 1), 175.00, 80.00),
    
    -- Fees & Charges ($15 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Fees & Charges' LIMIT 1), 15.00, 80.00),
    
    -- Financial ($3500 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Financial' LIMIT 1), 3500.00, 80.00),
    
    -- Food & Dining ($1100 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Food & Dining' LIMIT 1), 1100.00, 80.00),
    
    -- Gifts & Donations ($150 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Gifts & Donations' LIMIT 1), 150.00, 80.00),
    
    -- Health & Fitness ($215 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Health & Fitness' LIMIT 1), 215.00, 80.00),
    
    -- Home ($2350 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Home' LIMIT 1), 2350.00, 80.00),
    
    -- Income ($0 total - for tracking)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Income' LIMIT 1), 0.00, 80.00),
    
    -- Insurance ($430 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Insurance' LIMIT 1), 430.00, 80.00),
    
    -- Personal Care ($155 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Personal Care' LIMIT 1), 155.00, 80.00),
    
    -- Pets ($150 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Pets' LIMIT 1), 150.00, 80.00),
    
    -- Shopping ($500 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Shopping' LIMIT 1), 500.00, 80.00),
    
    -- Taxes ($1000 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Taxes' LIMIT 1), 1000.00, 80.00),
    
    -- Travel ($1000 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Travel' LIMIT 1), 1000.00, 80.00),
    
    -- Uncategorized ($0 total)
    ((SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1), 
     (SELECT id FROM public.categories WHERE user_id = 'your-user-id-here' AND name = 'Uncategorized' LIMIT 1), 0.00, 80.00)
ON CONFLICT (budget_id, category_id) DO NOTHING;

-- Step 4: Activate all sub-categories for the 2025 budget
INSERT INTO public.budget_sub_categories (budget_id, sub_category_id, is_active)
SELECT 
    (SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1),
    sc.id,
    TRUE
FROM public.sub_categories sc
WHERE sc.category_id IN (
    SELECT id FROM public.categories WHERE user_id = 'your-user-id-here'
)
ON CONFLICT (budget_id, sub_category_id) DO NOTHING;

-- Verification queries
SELECT '2025 Budget import completed successfully' as status;
SELECT COUNT(*) as categories_created FROM public.categories WHERE user_id = 'your-user-id-here';
SELECT COUNT(*) as sub_categories_created FROM public.sub_categories WHERE category_id IN (
    SELECT id FROM public.categories WHERE user_id = 'your-user-id-here'
);
SELECT COUNT(*) as budget_limits_created FROM public.budget_category_limits WHERE budget_id = (
    SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1
);
SELECT COUNT(*) as budget_sub_categories_activated FROM public.budget_sub_categories WHERE budget_id = (
    SELECT id FROM public.budgets WHERE user_id = 'your-user-id-here' AND name = 'Primary 2025' AND year = 2025 LIMIT 1
);

-- IMPORTANT: Replace 'your-user-id-here' with your actual user_id from auth.users table
-- You can find your user_id by running: SELECT id, email FROM auth.users;
