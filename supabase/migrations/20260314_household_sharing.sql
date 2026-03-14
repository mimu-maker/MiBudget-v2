-- Migration to enable household sharing for Michael and Tanja
-- This allows both users to see the same data while keeping demo/test accounts separate.

-- 1. Create a function to check if the current user is part of the household
CREATE OR REPLACE FUNCTION public.is_household_member()
RETURNS BOOLEAN AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    SELECT email INTO current_user_email FROM auth.users WHERE id = auth.uid();
    RETURN current_user_email IN ('michaelmullally@gmail.com', 'tanjen2@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to get the household's master user_id
CREATE OR REPLACE FUNCTION public.get_household_master_user_id()
RETURNS UUID AS $$
DECLARE
    master_user_id UUID;
BEGIN
    SELECT id INTO master_user_id FROM auth.users WHERE email = 'michaelmullally@gmail.com';
    RETURN master_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users and household members can view profile" ON public.user_profiles
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );

-- 4. Update RLS policies for transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users and household members can view transactions" ON public.transactions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users and household members can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users and household members can update transactions" ON public.transactions
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users and household members can delete transactions" ON public.transactions
    FOR DELETE USING (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );

-- 5. Update RLS policies for categories
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users and household members can view categories" ON public.categories
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );

DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Users and household members can manage categories" ON public.categories
    FOR ALL USING (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );

-- 6. Update RLS policies for budgets
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
CREATE POLICY "Users and household members can view budgets" ON public.budgets
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );

DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;
CREATE POLICY "Users and household members can manage budgets" ON public.budgets
    FOR ALL USING (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );

-- 7. Update RLS policies for merchant_rules
DROP POLICY IF EXISTS "Users can view own merchant rules" ON public.merchant_rules;
CREATE POLICY "Users and household members can view merchant rules" ON public.merchant_rules
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );

DROP POLICY IF EXISTS "Users can manage own merchant rules" ON public.merchant_rules;
CREATE POLICY "Users and household members can manage merchant rules" ON public.merchant_rules
    FOR ALL USING (
        auth.uid() = user_id OR 
        (public.is_household_member() AND user_id = public.get_household_master_user_id())
    );
