-- ============================================================
-- PHASE 2: RLS OVERHAUL
-- Replace all legacy is_household_member() / get_my_profile_id()
-- / household-based policies with account_id = get_my_account_id()
-- ============================================================

-- STEP 1: Add account_id to tables that don't have it yet
ALTER TABLE public.merchant_rules ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);
ALTER TABLE public.source_rules   ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);

-- STEP 2: Backfill account_id for merchant_rules and source_rules
-- Both tables use auth UUID as user_id
DO $$
DECLARE
    v_mullally_account_id UUID;
    v_mullally_auth_id    UUID;
    v_demo_account_id     CONSTANT UUID := '00000000-0000-4000-a000-000000000001';
    v_demo_auth_id        CONSTANT UUID := '00000000-0000-0000-0000-000000000002';
    v_mullally_profile_id CONSTANT UUID := '92325837-1cf0-4157-82c6-82a233389b1a';
BEGIN
    SELECT current_account_id, user_id
      INTO v_mullally_account_id, v_mullally_auth_id
      FROM public.user_profiles
     WHERE id = v_mullally_profile_id;

    UPDATE public.merchant_rules SET account_id = v_mullally_account_id WHERE user_id = v_mullally_auth_id AND account_id IS NULL;
    UPDATE public.source_rules   SET account_id = v_mullally_account_id WHERE user_id = v_mullally_auth_id AND account_id IS NULL;

    UPDATE public.merchant_rules SET account_id = v_demo_account_id WHERE user_id = v_demo_auth_id AND account_id IS NULL;
    UPDATE public.source_rules   SET account_id = v_demo_account_id WHERE user_id = v_demo_auth_id AND account_id IS NULL;

    -- Delete any orphan rows that couldn't be assigned an account
    DELETE FROM public.merchant_rules WHERE account_id IS NULL;
    DELETE FROM public.source_rules   WHERE account_id IS NULL;
END $$;

-- STEP 3: Enforce NOT NULL on account_id for all data tables
ALTER TABLE public.transactions  ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.budgets       ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.categories    ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.projections   ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.merchant_rules ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.source_rules   ALTER COLUMN account_id SET NOT NULL;

-- STEP 4: Drop all legacy policies

-- transactions
DROP POLICY IF EXISTS "Users and household members can view transactions"    ON public.transactions;
DROP POLICY IF EXISTS "Users and household members can insert transactions"   ON public.transactions;
DROP POLICY IF EXISTS "Users and household members can update transactions"   ON public.transactions;
DROP POLICY IF EXISTS "Users and household members can delete transactions"   ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions"                       ON public.transactions;
DROP POLICY IF EXISTS "Account members can view transactions"                 ON public.transactions;
DROP POLICY IF EXISTS "Account admins/editors can manage transactions"        ON public.transactions;

-- budgets
DROP POLICY IF EXISTS "Users and household members can view budgets"          ON public.budgets;
DROP POLICY IF EXISTS "Users and household members can manage budgets"        ON public.budgets;
DROP POLICY IF EXISTS "Users can view own budgets"                            ON public.budgets;
DROP POLICY IF EXISTS "Account members can view budgets"                      ON public.budgets;
DROP POLICY IF EXISTS "Account admins/editors can manage budgets"             ON public.budgets;

-- categories
DROP POLICY IF EXISTS "Users and household members can view categories"       ON public.categories;
DROP POLICY IF EXISTS "Users and household members can manage categories"     ON public.categories;
DROP POLICY IF EXISTS "Users can view own categories"                         ON public.categories;
DROP POLICY IF EXISTS "Account members can view categories"                   ON public.categories;
DROP POLICY IF EXISTS "Account admins/editors can manage categories"          ON public.categories;

-- projections
DROP POLICY IF EXISTS "Users can view their own projections"                  ON public.projections;
DROP POLICY IF EXISTS "Users can insert their own projections"                ON public.projections;
DROP POLICY IF EXISTS "Users can update their own projections"                ON public.projections;
DROP POLICY IF EXISTS "Users can delete their own projections"                ON public.projections;
DROP POLICY IF EXISTS "Users can manage their own projections"                ON public.projections;
DROP POLICY IF EXISTS "Account members can view projections"                  ON public.projections;
DROP POLICY IF EXISTS "Account admins/editors can manage projections"         ON public.projections;

-- merchant_rules
DROP POLICY IF EXISTS "Users and household members can view merchant rules"   ON public.merchant_rules;
DROP POLICY IF EXISTS "Users and household members can manage merchant rules" ON public.merchant_rules;
DROP POLICY IF EXISTS "Users can insert own merchant rules"                   ON public.merchant_rules;
DROP POLICY IF EXISTS "Users can update own merchant rules"                   ON public.merchant_rules;
DROP POLICY IF EXISTS "Users can delete own merchant rules"                   ON public.merchant_rules;

-- source_rules
DROP POLICY IF EXISTS "Users can manage own source rules"                     ON public.source_rules;
DROP POLICY IF EXISTS "Users can manage their own rules"                      ON public.source_rules;

-- sub_categories
DROP POLICY IF EXISTS "Users can view own sub_categories"                     ON public.sub_categories;
DROP POLICY IF EXISTS "Users can manage own sub_categories"                   ON public.sub_categories;

-- budget_category_limits
DROP POLICY IF EXISTS "Users can view own budget_category_limits"             ON public.budget_category_limits;
DROP POLICY IF EXISTS "Users can manage own budget_category_limits"           ON public.budget_category_limits;

-- budget_sub_categories
DROP POLICY IF EXISTS "Users can view own budget sub-categories"              ON public.budget_sub_categories;
DROP POLICY IF EXISTS "Users can manage own budget sub-categories"            ON public.budget_sub_categories;

-- user_profiles (drop legacy household-sharing policy only)
DROP POLICY IF EXISTS "Users and household members can view profile"          ON public.user_profiles;

-- STEP 5: Create new unified account-based policies

-- transactions
CREATE POLICY "Account members can manage transactions"
ON public.transactions FOR ALL
USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());

-- budgets
CREATE POLICY "Account members can manage budgets"
ON public.budgets FOR ALL
USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());

-- categories
CREATE POLICY "Account members can manage categories"
ON public.categories FOR ALL
USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());

-- projections
CREATE POLICY "Account members can manage projections"
ON public.projections FOR ALL
USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());

-- merchant_rules
CREATE POLICY "Account members can manage merchant rules"
ON public.merchant_rules FOR ALL
USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());

-- source_rules
CREATE POLICY "Account members can manage source rules"
ON public.source_rules FOR ALL
USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());

-- sub_categories: join through categories.account_id
CREATE POLICY "Account members can manage sub_categories"
ON public.sub_categories FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.categories
    WHERE categories.id = sub_categories.category_id
      AND categories.account_id = public.get_my_account_id()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.categories
    WHERE categories.id = sub_categories.category_id
      AND categories.account_id = public.get_my_account_id()
));

-- budget_category_limits: join through budgets.account_id
CREATE POLICY "Account members can manage budget_category_limits"
ON public.budget_category_limits FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.budgets
    WHERE budgets.id = budget_category_limits.budget_id
      AND budgets.account_id = public.get_my_account_id()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets
    WHERE budgets.id = budget_category_limits.budget_id
      AND budgets.account_id = public.get_my_account_id()
));

-- budget_sub_categories: join through budgets.account_id
CREATE POLICY "Account members can manage budget_sub_categories"
ON public.budget_sub_categories FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.budgets
    WHERE budgets.id = budget_sub_categories.budget_id
      AND budgets.account_id = public.get_my_account_id()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets
    WHERE budgets.id = budget_sub_categories.budget_id
      AND budgets.account_id = public.get_my_account_id()
));

-- STEP 6: Harden get_my_account_id search_path
ALTER FUNCTION public.get_my_account_id() SET search_path = public;
