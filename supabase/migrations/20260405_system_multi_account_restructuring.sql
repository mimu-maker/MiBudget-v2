-- ==========================================
-- MULTI-ACCOUNT (MULTI-TENANT) ARCHITECTURE
-- ==========================================
-- This migration transforms MiBudget from a single-user system to a 
-- multi-account architecture where Users belong to Accounts.

-- 1. Create the Accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create the Account Members table
CREATE TABLE IF NOT EXISTS public.account_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL, -- FK to user_profiles(id) NOT auth.users(id)
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'readonly')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(account_id, user_id)
);

-- 3. Add account_id to existing tables
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS current_account_id UUID REFERENCES public.accounts(id);

-- Helper: Add account_id safely with defaults
DO $$
BEGIN
    -- budgets
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'account_id') THEN
        ALTER TABLE public.budgets ADD COLUMN account_id UUID REFERENCES public.accounts(id);
    END IF;
    -- categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'account_id') THEN
        ALTER TABLE public.categories ADD COLUMN account_id UUID REFERENCES public.accounts(id);
    END IF;
    -- transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'account_id') THEN
        ALTER TABLE public.transactions ADD COLUMN account_id UUID REFERENCES public.accounts(id);
    END IF;
    -- merchant_rules
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_rules' AND column_name = 'account_id') THEN
        ALTER TABLE public.merchant_rules ADD COLUMN account_id UUID REFERENCES public.accounts(id);
    END IF;
    -- income_streams
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'income_streams' AND column_name = 'account_id') THEN
        ALTER TABLE public.income_streams ADD COLUMN account_id UUID REFERENCES public.accounts(id);
    END IF;
    -- future_transactions (projections)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'future_transactions' AND column_name = 'account_id') THEN
        ALTER TABLE public.future_transactions ADD COLUMN account_id UUID REFERENCES public.accounts(id);
    END IF;
END $$;

-- 4. BOOTSTRAP: Create the "Mullally Household" Account
DO $$
DECLARE
    v_account_id UUID;
    v_michael_profile_id UUID;
    v_tanja_profile_id UUID;
BEGIN
    -- Create the main account
    INSERT INTO public.accounts (name, slug)
    VALUES ('Mullally Household', 'mullally-household')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_account_id;

    -- Find Michael's profile
    SELECT id INTO v_michael_profile_id FROM public.user_profiles WHERE email = 'michaelmullally@gmail.com';
    -- Find Tanja's profile
    SELECT id INTO v_tanja_profile_id FROM public.user_profiles WHERE email = 'tanjen2@gmail.com';

    -- Link Michael (Admin)
    IF v_michael_profile_id IS NOT NULL THEN
        UPDATE public.user_profiles SET current_account_id = v_account_id WHERE id = v_michael_profile_id;
        INSERT INTO public.account_members (account_id, user_id, role)
        VALUES (v_account_id, v_michael_profile_id, 'admin')
        ON CONFLICT (account_id, user_id) DO NOTHING;
        
        -- MIGRATE MICHAEL'S DATA
        -- Link HIS budgets to this account
        UPDATE public.budgets SET account_id = v_account_id WHERE user_id = v_michael_profile_id AND account_id IS NULL;
        UPDATE public.categories SET account_id = v_account_id WHERE user_id = v_michael_profile_id AND account_id IS NULL;
        UPDATE public.transactions SET account_id = v_account_id WHERE user_id = v_michael_profile_id AND account_id IS NULL;
        UPDATE public.future_transactions SET account_id = v_account_id WHERE user_id = v_michael_profile_id AND account_id IS NULL;
    END IF;

    -- Link Tanja (Editor/Admin as per Michael's request)
    IF v_tanja_profile_id IS NOT NULL THEN
        UPDATE public.user_profiles SET current_account_id = v_account_id WHERE id = v_tanja_profile_id;
        INSERT INTO public.account_members (account_id, user_id, role)
        VALUES (v_account_id, v_tanja_profile_id, 'admin') -- Both are admins for now
        ON CONFLICT (account_id, user_id) DO NOTHING;
    END IF;
END $$;

-- 5. RLS: Account-Based Security
-- Create a non-recursive function to get the current account ID
CREATE OR REPLACE FUNCTION public.get_my_account_id()
RETURNS uuid AS $$
  SELECT current_account_id FROM public.user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. UPDATE RLS ON ALL DATA TABLES
-- Budgets
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
CREATE POLICY "Account members can view budgets" 
ON public.budgets FOR SELECT 
USING (account_id = public.get_my_account_id());

DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;
CREATE POLICY "Account admins/editors can manage budgets"
ON public.budgets FOR ALL
USING (account_id = public.get_my_account_id());

-- Transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Account members can view transactions"
ON public.transactions FOR SELECT
USING (account_id = public.get_my_account_id());

DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
CREATE POLICY "Account admins/editors can manage transactions"
ON public.transactions FOR ALL
USING (account_id = public.get_my_account_id());

-- Categories
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Account members can view categories"
ON public.categories FOR SELECT
USING (account_id = public.get_my_account_id());

DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Account admins/editors can manage categories"
ON public.categories FOR ALL
USING (account_id = public.get_my_account_id());

-- Projections
DROP POLICY IF EXISTS "Users can view own projections" ON public.future_transactions;
CREATE POLICY "Account members can view projections"
ON public.future_transactions FOR SELECT
USING (account_id = public.get_my_account_id());

DROP POLICY IF EXISTS "Users can manage own projections" ON public.future_transactions;
CREATE POLICY "Account admins/editors can manage projections"
ON public.future_transactions FOR ALL
USING (account_id = public.get_my_account_id());

-- 7. SECURITY: Ensure data created from now on MUST have an account_id
ALTER TABLE public.budgets ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.future_transactions ALTER COLUMN account_id SET NOT NULL;
