-- =============================================================
-- DEMO ACCOUNT BOOTSTRAP
-- Creates Demo Household account, real demo auth user,
-- full US household category taxonomy, annual budget,
-- seed tables for demo reset, and reset_demo_account() function.
--
-- KEY SCHEMA NOTES:
--   - handle_new_user trigger fires on auth.users INSERT → creates user_profiles row
--   - There is likely a deletion trigger on auth.users → cascades to user_profiles
--   - Fix: update demo profile user_id BEFORE deleting sentinel auth user
--   - user_profiles.user_id has NO FK to auth.users (safe to set to future UUID)
--   - categories/budgets.user_id = user_profiles.id (profile id, NOT auth uid)
--   - transactions.user_id = auth uid (no FK constraint)
--   - public.users mirrors auth.users (needed for merchant_rules FK)
--   - accounts table has no updated_at column
--   - auth.identities.email is a generated column (cannot insert explicitly)
-- =============================================================

DO $$
DECLARE
  v_demo_account_id   CONSTANT UUID := '00000000-0000-4000-a000-000000000001';
  v_demo_auth_id      CONSTANT UUID := '00000000-0000-4000-a000-000000000002';
  v_demo_profile_id   CONSTANT UUID := '2edb305b-d267-4e7c-9411-1e83d503bc68';
  v_sentinel_id       CONSTANT UUID := '00000000-0000-0000-0000-000000000002';
  v_mullally_id       CONSTANT UUID := '92325837-1cf0-4157-82c6-82a233389b1a';
  v_tanja_profile_id  CONSTANT UUID := 'ed2aaf21-4c63-4225-b98a-eccf41005b6d';
  v_mimu_profile_id   CONSTANT UUID := 'cb088a95-f36e-4505-8079-7b7d160dcaac';
  v_mimu_auth_id      CONSTANT UUID := '2cbb824d-3cb8-4bb3-8daf-75b027546a7e';
  v_demo_budget_id    CONSTANT UUID := '00000000-0000-4000-a300-000000000001';

  v_cat_income        CONSTANT UUID := '00000000-0000-4000-a100-000000000001';
  v_cat_housing       CONSTANT UUID := '00000000-0000-4000-a100-000000000002';
  v_cat_utilities     CONSTANT UUID := '00000000-0000-4000-a100-000000000003';
  v_cat_food          CONSTANT UUID := '00000000-0000-4000-a100-000000000004';
  v_cat_transport     CONSTANT UUID := '00000000-0000-4000-a100-000000000005';
  v_cat_health        CONSTANT UUID := '00000000-0000-4000-a100-000000000006';
  v_cat_shopping      CONSTANT UUID := '00000000-0000-4000-a100-000000000007';
  v_cat_entertain     CONSTANT UUID := '00000000-0000-4000-a100-000000000008';
  v_cat_personal      CONSTANT UUID := '00000000-0000-4000-a100-000000000009';
  v_cat_gifts         CONSTANT UUID := '00000000-0000-4000-a100-000000000010';
  v_cat_transfer      CONSTANT UUID := '00000000-0000-4000-a100-000000000011';
  v_cat_savings       CONSTANT UUID := '00000000-0000-4000-a100-000000000012';
  v_cat_slush         CONSTANT UUID := '00000000-0000-4000-a100-000000000013';
BEGIN

  -- ============================================================
  -- A. CREATE DEMO HOUSEHOLD ACCOUNT
  -- ============================================================
  INSERT INTO public.accounts (id, name, slug, created_at)
  VALUES (v_demo_account_id, 'Demo Household', 'demo-household', now())
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- B. MOVE SENTINEL DEMO TRANSACTIONS TO DEMO ACCOUNT
  -- ============================================================
  UPDATE public.transactions
    SET account_id = v_demo_account_id
    WHERE user_id = v_sentinel_id;

  -- ============================================================
  -- C. PROTECT DEMO PROFILE BEFORE DELETING SENTINEL
  -- Update demo profile user_id to the NEW auth id BEFORE deleting
  -- sentinel — otherwise the deletion trigger on auth.users will
  -- cascade-delete this profile (it looks up by user_id = sentinel).
  -- user_profiles.user_id has no FK, so setting a not-yet-existing
  -- UUID is safe within this transaction.
  -- ============================================================
  UPDATE public.user_profiles
    SET user_id = v_demo_auth_id
    WHERE id = v_demo_profile_id;

  -- ============================================================
  -- D. DELETE MIMU USER (no user needed per spec)
  -- ============================================================
  DELETE FROM public.user_profiles WHERE id = v_mimu_profile_id;
  DELETE FROM public.users WHERE id = v_mimu_auth_id;
  DELETE FROM auth.users WHERE id = v_mimu_auth_id;

  -- ============================================================
  -- E. REPLACE SENTINEL WITH REAL DEMO AUTH USER
  -- Safe now: demo profile's user_id no longer points to sentinel.
  -- handle_new_user trigger will fire on INSERT and create an orphan
  -- profile — we delete it right after.
  -- ============================================================
  DELETE FROM public.users WHERE id = v_sentinel_id;
  DELETE FROM auth.users WHERE id = v_sentinel_id;

  INSERT INTO auth.users (
    id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_sso_user, is_anonymous, created_at, updated_at
  ) VALUES (
    v_demo_auth_id, 'authenticated', 'authenticated', 'demo@example.com',
    crypt('demo123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo User"}'::jsonb,
    false, false, now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  -- Create email/password identity
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
  VALUES (
    v_demo_auth_id, v_demo_auth_id,
    jsonb_build_object('sub', v_demo_auth_id::text, 'email', 'demo@example.com'),
    'email', now(), now(), now(), 'demo@example.com'
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Mirror in public.users (for merchant_rules FK)
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (v_demo_auth_id, 'demo@example.com', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Delete the orphan profile auto-created by handle_new_user trigger
  DELETE FROM public.user_profiles
    WHERE user_id = v_demo_auth_id AND id <> v_demo_profile_id;

  -- ============================================================
  -- F. UPDATE DEMO TRANSACTIONS USER_ID (sentinel → real demo)
  -- ============================================================
  UPDATE public.transactions
    SET user_id = v_demo_auth_id
    WHERE user_id = v_sentinel_id;

  -- ============================================================
  -- G. FINISH DEMO PROFILE SETUP
  -- ============================================================
  UPDATE public.user_profiles
    SET full_name          = 'Demo User',
        role               = 'admin',
        current_account_id = v_demo_account_id,
        is_setup_complete  = true,
        updated_at         = now()
    WHERE id = v_demo_profile_id;

  -- ============================================================
  -- H. ACCOUNT MEMBERS: DEMO → DEMO HOUSEHOLD
  -- ============================================================
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (v_demo_account_id, v_demo_profile_id, 'admin')
  ON CONFLICT (account_id, user_id) DO NOTHING;

  -- ============================================================
  -- I. MULLALLY HOUSEHOLD: LINK TANJA
  -- ============================================================
  UPDATE public.user_profiles
    SET current_account_id = v_mullally_id, updated_at = now()
    WHERE id = v_tanja_profile_id;

  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (v_mullally_id, v_tanja_profile_id, 'admin')
  ON CONFLICT (account_id, user_id) DO NOTHING;

  -- ============================================================
  -- J. DEMO CATEGORIES (13)
  -- user_id = profile id (consistent with categories/budgets pattern)
  -- ============================================================
  INSERT INTO public.categories (id, user_id, name, icon, color, is_system, category_group, display_order, label, account_id) VALUES
    (v_cat_income,    v_demo_profile_id, 'Income',           'TrendingUp',   '#22c55e', false, 'Income',   1,  NULL,                 v_demo_account_id),
    (v_cat_housing,   v_demo_profile_id, 'Housing',          'Home',         '#64748b', false, 'Expense',  2,  'Fixed Committed',    v_demo_account_id),
    (v_cat_utilities, v_demo_profile_id, 'Utilities',        'Zap',          '#f59e0b', false, 'Expense',  3,  'Variable Essential', v_demo_account_id),
    (v_cat_food,      v_demo_profile_id, 'Food & Groceries', 'ShoppingCart', '#14b8a6', false, 'Expense',  4,  'Variable Essential', v_demo_account_id),
    (v_cat_transport, v_demo_profile_id, 'Transportation',   'Car',          '#8b5cf6', false, 'Expense',  5,  'Variable Essential', v_demo_account_id),
    (v_cat_health,    v_demo_profile_id, 'Health',           'Heart',        '#ef4444', false, 'Expense',  6,  'Variable Essential', v_demo_account_id),
    (v_cat_shopping,  v_demo_profile_id, 'Shopping',         'ShoppingBag',  '#f97316', false, 'Expense',  7,  'Discretionary',      v_demo_account_id),
    (v_cat_entertain, v_demo_profile_id, 'Entertainment',    'Tv',           '#ec4899', false, 'Expense',  8,  'Discretionary',      v_demo_account_id),
    (v_cat_personal,  v_demo_profile_id, 'Personal Care',    'User',         '#06b6d4', false, 'Expense',  9,  'Discretionary',      v_demo_account_id),
    (v_cat_gifts,     v_demo_profile_id, 'Gifts & Giving',   'Gift',         '#a855f7', false, 'Expense',  10, 'Discretionary',      v_demo_account_id),
    (v_cat_transfer,  v_demo_profile_id, 'Transfers',        'CreditCard',   '#94a3b8', false, 'Transfer', 11, 'Discretionary',      v_demo_account_id),
    (v_cat_savings,   v_demo_profile_id, 'Savings',          'PiggyBank',    '#6366f1', false, 'Savings',  12, 'Discretionary',      v_demo_account_id),
    (v_cat_slush,     v_demo_profile_id, 'Slush Fund',       'Flame',        '#ef4444', false, 'Slush',    13, NULL,                 v_demo_account_id)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- K. DEMO SUB-CATEGORIES (53 total)
  -- UUID pattern: 00000000-0000-4000-a200-00000000CCSS
  --   CC = category number, SS = sub number (decimal, zero-padded)
  -- ============================================================
  INSERT INTO public.sub_categories (id, category_id, name, display_order, budget_amount, label) VALUES
    -- Income (01xx)
    ('00000000-0000-4000-a200-000000000101', v_cat_income, 'Salary & Wages',        1, 0, NULL),
    ('00000000-0000-4000-a200-000000000102', v_cat_income, 'Freelance & Contract',  2, 0, NULL),
    ('00000000-0000-4000-a200-000000000103', v_cat_income, 'Investment Income',     3, 0, NULL),
    ('00000000-0000-4000-a200-000000000104', v_cat_income, 'Other Income',          4, 0, NULL),
    -- Housing (02xx)
    ('00000000-0000-4000-a200-000000000201', v_cat_housing, 'Mortgage & Rent',      1, 0, 'Fixed Committed'),
    ('00000000-0000-4000-a200-000000000202', v_cat_housing, 'Property Tax',         2, 0, 'Fixed Committed'),
    ('00000000-0000-4000-a200-000000000203', v_cat_housing, 'HOA Fees',             3, 0, 'Fixed Committed'),
    ('00000000-0000-4000-a200-000000000204', v_cat_housing, 'Home Insurance',       4, 0, 'Fixed Committed'),
    -- Utilities (03xx)
    ('00000000-0000-4000-a200-000000000301', v_cat_utilities, 'Electric',           1, 0, 'Variable Essential'),
    ('00000000-0000-4000-a200-000000000302', v_cat_utilities, 'Gas & Heating',      2, 0, 'Variable Essential'),
    ('00000000-0000-4000-a200-000000000303', v_cat_utilities, 'Water & Sewer',      3, 0, 'Variable Essential'),
    ('00000000-0000-4000-a200-000000000304', v_cat_utilities, 'Internet',           4, 0, 'Fixed Committed'),
    ('00000000-0000-4000-a200-000000000305', v_cat_utilities, 'Phone & Mobile',     5, 0, 'Fixed Committed'),
    -- Food & Groceries (04xx)
    ('00000000-0000-4000-a200-000000000401', v_cat_food, 'Groceries',              1, 0, 'Variable Essential'),
    ('00000000-0000-4000-a200-000000000402', v_cat_food, 'Dining Out',             2, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000403', v_cat_food, 'Coffee & Drinks',        3, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000404', v_cat_food, 'Meal Delivery',          4, 0, 'Discretionary'),
    -- Transportation (05xx)
    ('00000000-0000-4000-a200-000000000501', v_cat_transport, 'Car Payment',        1, 0, 'Fixed Committed'),
    ('00000000-0000-4000-a200-000000000502', v_cat_transport, 'Gas & Fuel',         2, 0, 'Variable Essential'),
    ('00000000-0000-4000-a200-000000000503', v_cat_transport, 'Auto Insurance',     3, 0, 'Fixed Committed'),
    ('00000000-0000-4000-a200-000000000504', v_cat_transport, 'Parking & Tolls',    4, 0, 'Variable Essential'),
    ('00000000-0000-4000-a200-000000000505', v_cat_transport, 'Public Transit',     5, 0, 'Variable Essential'),
    ('00000000-0000-4000-a200-000000000506', v_cat_transport, 'Car Maintenance',    6, 0, 'Variable Essential'),
    -- Health (06xx)
    ('00000000-0000-4000-a200-000000000601', v_cat_health, 'Health Insurance',      1, 0, 'Fixed Committed'),
    ('00000000-0000-4000-a200-000000000602', v_cat_health, 'Prescriptions',         2, 0, 'Variable Essential'),
    ('00000000-0000-4000-a200-000000000603', v_cat_health, 'Doctor Visits',         3, 0, 'Variable Essential'),
    ('00000000-0000-4000-a200-000000000604', v_cat_health, 'Gym & Fitness',         4, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000605', v_cat_health, 'Dental & Vision',       5, 0, 'Variable Essential'),
    -- Shopping (07xx)
    ('00000000-0000-4000-a200-000000000701', v_cat_shopping, 'Clothing',            1, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000702', v_cat_shopping, 'Electronics',         2, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000703', v_cat_shopping, 'Home Goods',          3, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000704', v_cat_shopping, 'Online Shopping',     4, 0, 'Discretionary'),
    -- Entertainment (08xx)
    ('00000000-0000-4000-a200-000000000801', v_cat_entertain, 'Streaming Services', 1, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000802', v_cat_entertain, 'Movies & Shows',     2, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000803', v_cat_entertain, 'Sports & Events',    3, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000804', v_cat_entertain, 'Hobbies',            4, 0, 'Discretionary'),
    -- Personal Care (09xx)
    ('00000000-0000-4000-a200-000000000901', v_cat_personal, 'Haircuts & Beauty',   1, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000902', v_cat_personal, 'Personal Hygiene',    2, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000000903', v_cat_personal, 'Pet Care',            3, 0, 'Discretionary'),
    -- Gifts & Giving (10xx)
    ('00000000-0000-4000-a200-000000001001', v_cat_gifts, 'Gifts',                  1, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000001002', v_cat_gifts, 'Charitable Donations',   2, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000001003', v_cat_gifts, 'Birthdays & Holidays',   3, 0, 'Discretionary'),
    -- Transfers (11xx)
    ('00000000-0000-4000-a200-000000001101', v_cat_transfer, 'Credit Card Payment', 1, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000001102', v_cat_transfer, 'Bank Transfer',       2, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000001103', v_cat_transfer, 'Loan Payment',        3, 0, 'Fixed Committed'),
    -- Savings (12xx)
    ('00000000-0000-4000-a200-000000001201', v_cat_savings, 'Emergency Fund',        1, 0, 'Discretionary'),
    ('00000000-0000-4000-a200-000000001202', v_cat_savings, 'Retirement (401k/IRA)', 2, 0, 'Fixed Committed'),
    ('00000000-0000-4000-a200-000000001203', v_cat_savings, 'Short-Term Savings',    3, 0, 'Discretionary'),
    -- Slush Fund (13xx)
    ('00000000-0000-4000-a200-000000001301', v_cat_slush, 'Home Improvement',  1, 0, NULL),
    ('00000000-0000-4000-a200-000000001302', v_cat_slush, 'Vacation & Travel', 2, 0, NULL),
    ('00000000-0000-4000-a200-000000001303', v_cat_slush, 'Medical Emergency', 3, 0, NULL),
    ('00000000-0000-4000-a200-000000001304', v_cat_slush, 'Large Purchases',   4, 0, NULL),
    ('00000000-0000-4000-a200-000000001305', v_cat_slush, 'Car Major Repair',  5, 0, NULL)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- L. DEMO BUDGET (Annual 2026)
  -- ============================================================
  INSERT INTO public.budgets (id, user_id, name, period_type, start_date, is_active, budget_type, year, account_id)
  VALUES (v_demo_budget_id, v_demo_profile_id, 'Demo Household 2026', 'annual', '2026-01-01', true, 'standard', 2026, v_demo_account_id)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- M. BUDGET CATEGORY LIMITS (annual USD amounts)
  -- ============================================================
  INSERT INTO public.budget_category_limits (budget_id, category_id, sub_category_id, limit_amount, is_active) VALUES
    (v_demo_budget_id, v_cat_income,    '00000000-0000-4000-a200-000000000101', 62400, true),
    (v_demo_budget_id, v_cat_income,    '00000000-0000-4000-a200-000000000102',  6000, true),
    (v_demo_budget_id, v_cat_income,    '00000000-0000-4000-a200-000000000103',  1200, true),
    (v_demo_budget_id, v_cat_income,    '00000000-0000-4000-a200-000000000104',   600, true),
    (v_demo_budget_id, v_cat_housing,   '00000000-0000-4000-a200-000000000201', 25200, true),
    (v_demo_budget_id, v_cat_housing,   '00000000-0000-4000-a200-000000000202',  4800, true),
    (v_demo_budget_id, v_cat_housing,   '00000000-0000-4000-a200-000000000203',  1200, true),
    (v_demo_budget_id, v_cat_housing,   '00000000-0000-4000-a200-000000000204',  1800, true),
    (v_demo_budget_id, v_cat_utilities, '00000000-0000-4000-a200-000000000301',  1800, true),
    (v_demo_budget_id, v_cat_utilities, '00000000-0000-4000-a200-000000000302',  1200, true),
    (v_demo_budget_id, v_cat_utilities, '00000000-0000-4000-a200-000000000303',   600, true),
    (v_demo_budget_id, v_cat_utilities, '00000000-0000-4000-a200-000000000304',  1080, true),
    (v_demo_budget_id, v_cat_utilities, '00000000-0000-4000-a200-000000000305',  1440, true),
    (v_demo_budget_id, v_cat_food,      '00000000-0000-4000-a200-000000000401',  8400, true),
    (v_demo_budget_id, v_cat_food,      '00000000-0000-4000-a200-000000000402',  3600, true),
    (v_demo_budget_id, v_cat_food,      '00000000-0000-4000-a200-000000000403',  1440, true),
    (v_demo_budget_id, v_cat_food,      '00000000-0000-4000-a200-000000000404',  1200, true),
    (v_demo_budget_id, v_cat_transport, '00000000-0000-4000-a200-000000000501',  5100, true),
    (v_demo_budget_id, v_cat_transport, '00000000-0000-4000-a200-000000000502',  3000, true),
    (v_demo_budget_id, v_cat_transport, '00000000-0000-4000-a200-000000000503',  2400, true),
    (v_demo_budget_id, v_cat_transport, '00000000-0000-4000-a200-000000000504',   600, true),
    (v_demo_budget_id, v_cat_transport, '00000000-0000-4000-a200-000000000505',  1200, true),
    (v_demo_budget_id, v_cat_transport, '00000000-0000-4000-a200-000000000506',  1200, true),
    (v_demo_budget_id, v_cat_health,    '00000000-0000-4000-a200-000000000601',  7200, true),
    (v_demo_budget_id, v_cat_health,    '00000000-0000-4000-a200-000000000602',  1200, true),
    (v_demo_budget_id, v_cat_health,    '00000000-0000-4000-a200-000000000603',  1200, true),
    (v_demo_budget_id, v_cat_health,    '00000000-0000-4000-a200-000000000604',   720, true),
    (v_demo_budget_id, v_cat_health,    '00000000-0000-4000-a200-000000000605',  1200, true),
    (v_demo_budget_id, v_cat_shopping,  '00000000-0000-4000-a200-000000000701',  2400, true),
    (v_demo_budget_id, v_cat_shopping,  '00000000-0000-4000-a200-000000000702',  1200, true),
    (v_demo_budget_id, v_cat_shopping,  '00000000-0000-4000-a200-000000000703',  1200, true),
    (v_demo_budget_id, v_cat_shopping,  '00000000-0000-4000-a200-000000000704',  1800, true),
    (v_demo_budget_id, v_cat_entertain, '00000000-0000-4000-a200-000000000801',   720, true),
    (v_demo_budget_id, v_cat_entertain, '00000000-0000-4000-a200-000000000802',   600, true),
    (v_demo_budget_id, v_cat_entertain, '00000000-0000-4000-a200-000000000803',  1200, true),
    (v_demo_budget_id, v_cat_entertain, '00000000-0000-4000-a200-000000000804',  1200, true),
    (v_demo_budget_id, v_cat_personal,  '00000000-0000-4000-a200-000000000901',  1200, true),
    (v_demo_budget_id, v_cat_personal,  '00000000-0000-4000-a200-000000000902',   600, true),
    (v_demo_budget_id, v_cat_personal,  '00000000-0000-4000-a200-000000000903',  2400, true),
    (v_demo_budget_id, v_cat_gifts,     '00000000-0000-4000-a200-000000001001',  1800, true),
    (v_demo_budget_id, v_cat_gifts,     '00000000-0000-4000-a200-000000001002',  2400, true),
    (v_demo_budget_id, v_cat_gifts,     '00000000-0000-4000-a200-000000001003',  1200, true),
    (v_demo_budget_id, v_cat_transfer,  '00000000-0000-4000-a200-000000001101',  6000, true),
    (v_demo_budget_id, v_cat_transfer,  '00000000-0000-4000-a200-000000001102',  2400, true),
    (v_demo_budget_id, v_cat_transfer,  '00000000-0000-4000-a200-000000001103',     0, true),
    (v_demo_budget_id, v_cat_savings,   '00000000-0000-4000-a200-000000001201',  3600, true),
    (v_demo_budget_id, v_cat_savings,   '00000000-0000-4000-a200-000000001202',  6000, true),
    (v_demo_budget_id, v_cat_savings,   '00000000-0000-4000-a200-000000001203',  2400, true),
    (v_demo_budget_id, v_cat_slush,     '00000000-0000-4000-a200-000000001301',  5000, true),
    (v_demo_budget_id, v_cat_slush,     '00000000-0000-4000-a200-000000001302',  4000, true),
    (v_demo_budget_id, v_cat_slush,     '00000000-0000-4000-a200-000000001303',  2000, true),
    (v_demo_budget_id, v_cat_slush,     '00000000-0000-4000-a200-000000001304',  3000, true),
    (v_demo_budget_id, v_cat_slush,     '00000000-0000-4000-a200-000000001305',  1500, true)
  ON CONFLICT (budget_id, sub_category_id) DO NOTHING;

  -- ============================================================
  -- N. PROJECTIONS (10 items for 2026)
  -- ============================================================
  INSERT INTO public.projections (id, user_id, date, merchant, amount, category, planned, description, budget_year, account_id) VALUES
    ('00000000-0000-4000-a400-000000000001', v_demo_profile_id, '2026-07-15', 'HVAC Systems Inc',  -4500, 'Slush Fund',      true,  'Full HVAC replacement — system is 18 years old',    2026, v_demo_account_id),
    ('00000000-0000-4000-a400-000000000002', v_demo_profile_id, '2026-08-01', 'Summer Vacation',   -3200, 'Slush Fund',      true,  'Family beach trip, 1 week',                         2026, v_demo_account_id),
    ('00000000-0000-4000-a400-000000000003', v_demo_profile_id, '2026-06-01', 'Apple Store',       -1800, 'Shopping',        true,  'New MacBook Pro replacement',                       2026, v_demo_account_id),
    ('00000000-0000-4000-a400-000000000004', v_demo_profile_id, '2026-11-20', 'Holiday Shopping',  -1500, 'Gifts & Giving',  true,  'Christmas + Hanukkah gifts budget',                 2026, v_demo_account_id),
    ('00000000-0000-4000-a400-000000000005', v_demo_profile_id, '2026-05-01', 'Roofing Pros LLC',   -400, 'Slush Fund',      true,  'Annual roof inspection before storm season',        2026, v_demo_account_id),
    ('00000000-0000-4000-a400-000000000006', v_demo_profile_id, '2026-03-01', 'Costco / Amazon',    -280, 'Entertainment',   true,  'Annual memberships renewal (Costco + Prime)',        2026, v_demo_account_id),
    ('00000000-0000-4000-a400-000000000007', v_demo_profile_id, '2026-04-15', 'IRS Refund',         2200, 'Income',          true,  'Expected federal tax refund',                       2026, v_demo_account_id),
    ('00000000-0000-4000-a400-000000000008', v_demo_profile_id, '2026-07-01', 'Employer Bonus',     3000, 'Income',          true,  'Mid-year performance bonus (estimated)',             2026, v_demo_account_id),
    ('00000000-0000-4000-a400-000000000009', v_demo_profile_id, '2026-09-01', 'Freelance Client',   1200, 'Income',          false, 'Potential web project — not confirmed yet',         2026, v_demo_account_id),
    ('00000000-0000-4000-a400-000000000010', v_demo_profile_id, '2026-05-15', 'Meineke Car Care',   -900, 'Transportation',  true,  'Brake pads + rotors (front and rear)',               2026, v_demo_account_id)
  ON CONFLICT (id) DO NOTHING;

END $$;

-- ============================================================
-- O. DEMO SEED TABLES (snapshot for reset_demo_account())
-- ============================================================
CREATE TABLE IF NOT EXISTS public.demo_seed_categories     (LIKE public.categories              INCLUDING DEFAULTS EXCLUDING CONSTRAINTS EXCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS public.demo_seed_sub_categories (LIKE public.sub_categories          INCLUDING DEFAULTS EXCLUDING CONSTRAINTS EXCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS public.demo_seed_budgets        (LIKE public.budgets                 INCLUDING DEFAULTS EXCLUDING CONSTRAINTS EXCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS public.demo_seed_bcl            (LIKE public.budget_category_limits  INCLUDING DEFAULTS EXCLUDING CONSTRAINTS EXCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS public.demo_seed_transactions   (LIKE public.transactions            INCLUDING DEFAULTS EXCLUDING CONSTRAINTS EXCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS public.demo_seed_projections    (LIKE public.projections             INCLUDING DEFAULTS EXCLUDING CONSTRAINTS EXCLUDING INDEXES);

TRUNCATE public.demo_seed_categories, public.demo_seed_sub_categories,
         public.demo_seed_budgets, public.demo_seed_bcl,
         public.demo_seed_transactions, public.demo_seed_projections;

INSERT INTO public.demo_seed_categories
  SELECT * FROM public.categories WHERE account_id = '00000000-0000-4000-a000-000000000001';

INSERT INTO public.demo_seed_sub_categories
  SELECT sc.* FROM public.sub_categories sc
  JOIN public.categories c ON sc.category_id = c.id
  WHERE c.account_id = '00000000-0000-4000-a000-000000000001';

INSERT INTO public.demo_seed_budgets
  SELECT * FROM public.budgets WHERE account_id = '00000000-0000-4000-a000-000000000001';

INSERT INTO public.demo_seed_bcl
  SELECT bcl.* FROM public.budget_category_limits bcl
  JOIN public.budgets b ON bcl.budget_id = b.id
  WHERE b.account_id = '00000000-0000-4000-a000-000000000001';

INSERT INTO public.demo_seed_transactions
  SELECT * FROM public.transactions WHERE account_id = '00000000-0000-4000-a000-000000000001';

INSERT INTO public.demo_seed_projections
  SELECT * FROM public.projections WHERE account_id = '00000000-0000-4000-a000-000000000001';

-- ============================================================
-- P. RESET FUNCTION
-- Called on demo logout to restore data to factory state.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_demo_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_demo_account_id CONSTANT UUID := '00000000-0000-4000-a000-000000000001';
  v_caller_email TEXT;
BEGIN
  SELECT email INTO v_caller_email FROM public.user_profiles WHERE user_id = auth.uid();
  IF v_caller_email IS DISTINCT FROM 'demo@example.com' THEN
    RAISE EXCEPTION 'reset_demo_account() may only be called by the demo user';
  END IF;

  DELETE FROM public.projections            WHERE account_id = v_demo_account_id;
  DELETE FROM public.transactions           WHERE account_id = v_demo_account_id;
  DELETE FROM public.budget_category_limits
    WHERE budget_id IN (SELECT id FROM public.budgets WHERE account_id = v_demo_account_id);
  DELETE FROM public.budgets                WHERE account_id = v_demo_account_id;
  DELETE FROM public.sub_categories
    WHERE category_id IN (SELECT id FROM public.categories WHERE account_id = v_demo_account_id);
  DELETE FROM public.categories             WHERE account_id = v_demo_account_id;

  INSERT INTO public.categories             SELECT * FROM public.demo_seed_categories;
  INSERT INTO public.sub_categories         SELECT * FROM public.demo_seed_sub_categories;
  INSERT INTO public.budgets                SELECT * FROM public.demo_seed_budgets;
  INSERT INTO public.budget_category_limits SELECT * FROM public.demo_seed_bcl;
  INSERT INTO public.transactions           SELECT * FROM public.demo_seed_transactions;
  INSERT INTO public.projections            SELECT * FROM public.demo_seed_projections;
END;
$$;
