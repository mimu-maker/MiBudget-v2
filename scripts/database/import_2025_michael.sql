-- Profile ID (primary key in public.user_profiles) for michaelmullally@gmail.com:
-- d1ad5d65-da01-445f-bcfe-cc7f6552a424

DO $$
DECLARE
    profile_id UUID := 'd1ad5d65-da01-445f-bcfe-cc7f6552a424';
BEGIN
    -- Step 0: Delete existing data for Michael's account
    DELETE FROM public.budget_sub_categories
    WHERE budget_id IN (
        SELECT id FROM public.budgets WHERE user_id = profile_id
    );

    DELETE FROM public.budget_category_limits
    WHERE budget_id IN (
        SELECT id FROM public.budgets WHERE user_id = profile_id
    );

    DELETE FROM public.sub_categories
    WHERE category_id IN (
        SELECT id FROM public.categories WHERE user_id = profile_id
    );

    DELETE FROM public.categories
    WHERE user_id = profile_id;

    -- Optionally delete the budget row if you want a clean insert
    -- DELETE FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025;

    -- Step 1: Ensure the 2025 Primary Budget exists
    INSERT INTO public.budgets (user_id, name, year, budget_type, start_date, is_active)
    VALUES (profile_id, 'Primary 2025', 2025, 'primary', '2025-01-01', TRUE)
    ON CONFLICT (user_id, name, budget_type, year) DO NOTHING;

    -- Step 2: Create Categories and Sub-categories
    -- Auto & Transport
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Auto & Transport', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Auto & Transport' LIMIT 1), 'Gas & Fuel'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Auto & Transport' LIMIT 1), 'Parking'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Auto & Transport' LIMIT 1), 'Tesla')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Bills & Utilities
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Bills & Utilities', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Bills & Utilities' LIMIT 1), 'Electricity'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Bills & Utilities' LIMIT 1), 'Gas & Water'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Bills & Utilities' LIMIT 1), 'Internet'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Bills & Utilities' LIMIT 1), 'Phone'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Bills & Utilities' LIMIT 1), 'Trash')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Business Expenses
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Business Expenses', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Business Expenses' LIMIT 1), 'Advertising'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Business Expenses' LIMIT 1), 'Software')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Education
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Education', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Education' LIMIT 1), 'Student Loans'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Education' LIMIT 1), 'Tuition')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Entertainment
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Entertainment', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Entertainment' LIMIT 1), 'Amusement'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Entertainment' LIMIT 1), 'Events'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Entertainment' LIMIT 1), 'Media')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Fees & Charges
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Fees & Charges', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Fees & Charges' LIMIT 1), 'Bank Fees'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Fees & Charges' LIMIT 1), 'Service Fees')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Financial
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Financial', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Financial' LIMIT 1), 'Credit Card Payment'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Financial' LIMIT 1), 'Investment'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Financial' LIMIT 1), 'Loan')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Food & Dining
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Food & Dining', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Food & Dining' LIMIT 1), 'Fast Food'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Food & Dining' LIMIT 1), 'Groceries'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Food & Dining' LIMIT 1), 'Restaurants')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Gifts & Donations
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Gifts & Donations', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Gifts & Donations' LIMIT 1), 'Charity'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Gifts & Donations' LIMIT 1), 'Gifts')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Health & Fitness
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Health & Fitness', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Health & Fitness' LIMIT 1), 'Dental'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Health & Fitness' LIMIT 1), 'Doctor'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Health & Fitness' LIMIT 1), 'Gym'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Health & Fitness' LIMIT 1), 'Pharmacy')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Home
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Home', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Home' LIMIT 1), 'Home Improvement'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Home' LIMIT 1), 'Home Services'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Home' LIMIT 1), 'Rent'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Home' LIMIT 1), 'Supplies')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Income
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Income', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Income' LIMIT 1), 'Bonus'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Income' LIMIT 1), 'Paycheck'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Income' LIMIT 1), 'Reimbursement')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Insurance
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Insurance', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Insurance' LIMIT 1), 'Auto'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Insurance' LIMIT 1), 'Health'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Insurance' LIMIT 1), 'Life'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Insurance' LIMIT 1), 'Renters')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Personal Care
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Personal Care', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Personal Care' LIMIT 1), 'Clothing'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Personal Care' LIMIT 1), 'Hair'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Personal Care' LIMIT 1), 'Supplies')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Pets
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Pets', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Pets' LIMIT 1), 'Pet Food & Supplies'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Pets' LIMIT 1), 'Veterinary')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Shopping
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Shopping', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Shopping' LIMIT 1), 'Amazon'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Shopping' LIMIT 1), 'Department Stores'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Shopping' LIMIT 1), 'Electronics'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Shopping' LIMIT 1), 'Sporting Goods')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Taxes
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Taxes', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Taxes' LIMIT 1), 'Federal Tax'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Taxes' LIMIT 1), 'State Tax'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Taxes' LIMIT 1), 'Property Tax')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Travel
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Travel', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Travel' LIMIT 1), 'Flights'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Travel' LIMIT 1), 'Hotels'),
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Travel' LIMIT 1), 'Vacation')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Uncategorized
    INSERT INTO public.categories (user_id, name, is_system)
    VALUES (profile_id, 'Uncategorized', FALSE)
    ON CONFLICT (user_id, name) DO NOTHING;

    INSERT INTO public.sub_categories (category_id, name)
    VALUES 
        ((SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Uncategorized' LIMIT 1), 'Uncategorized')
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Step 3: Set Budget Category Limits for 2025
    INSERT INTO public.budget_category_limits (budget_id, category_id, limit_amount, alert_threshold)
    VALUES 
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Auto & Transport' LIMIT 1), 850.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Bills & Utilities' LIMIT 1), 420.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Business Expenses' LIMIT 1), 150.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Education' LIMIT 1), 1500.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Entertainment' LIMIT 1), 175.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Fees & Charges' LIMIT 1), 15.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Financial' LIMIT 1), 3500.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Food & Dining' LIMIT 1), 1100.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Gifts & Donations' LIMIT 1), 150.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Health & Fitness' LIMIT 1), 215.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Home' LIMIT 1), 2350.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Income' LIMIT 1), 0.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Insurance' LIMIT 1), 430.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Personal Care' LIMIT 1), 155.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Pets' LIMIT 1), 150.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Shopping' LIMIT 1), 500.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Taxes' LIMIT 1), 1000.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Travel' LIMIT 1), 1000.00, 80.00),
        ((SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1), (SELECT id FROM public.categories WHERE user_id = profile_id AND name = 'Uncategorized' LIMIT 1), 0.00, 80.00);

    -- Step 4: Activate all sub-categories for the 2025 budget
    INSERT INTO public.budget_sub_categories (budget_id, sub_category_id, is_active)
    SELECT 
        (SELECT id FROM public.budgets WHERE user_id = profile_id AND name = 'Primary 2025' AND year = 2025 LIMIT 1),
        sc.id,
        TRUE
    FROM public.sub_categories sc
    WHERE sc.category_id IN (
        SELECT id FROM public.categories WHERE user_id = profile_id
    );

END $$;

-- Verification queries (run separately as desired)
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
