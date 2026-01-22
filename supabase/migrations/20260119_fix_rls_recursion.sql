-- Fix RLS recursion issue in user_profiles policies
-- The issue: Policies were referencing user_profiles table which has RLS, creating circular dependency
-- Solution: Use direct auth.uid() comparison for user_profiles, and fix foreign key references

-- 1. Drop problematic RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;

-- 2. Fix user_profiles table structure
-- Ensure user_id in user_profiles directly references auth.users, not self-reference
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey,
ADD CONSTRAINT user_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Recreate simplified RLS policies for user_profiles
-- Users can view their own profile directly
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile directly
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. Fix other tables to reference user_id directly instead of id
-- Update budgets policies to use direct user_id reference
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;

CREATE POLICY "Users can view own budgets" ON public.budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own budgets" ON public.budgets
    FOR ALL USING (auth.uid() = user_id);

-- Update budget_accounts policies
DROP POLICY IF EXISTS "Users can view own budget accounts" ON public.budget_accounts;
DROP POLICY IF EXISTS "Users can manage own budget accounts" ON public.budget_accounts;

CREATE POLICY "Users can view own budget accounts" ON public.budget_accounts
    FOR SELECT USING (auth.uid() = 
        (SELECT user_id FROM public.budgets WHERE id = budget_accounts.budget_id)
    );

CREATE POLICY "Users can manage own budget accounts" ON public.budget_accounts
    FOR ALL USING (auth.uid() = 
        (SELECT user_id FROM public.budgets WHERE id = budget_accounts.budget_id)
    );

-- Update budget_category_limits policies
DROP POLICY IF EXISTS "Users can view own budget category limits" ON public.budget_category_limits;
DROP POLICY IF EXISTS "Users can manage own budget category limits" ON public.budget_category_limits;

CREATE POLICY "Users can view own budget category limits" ON public.budget_category_limits
    FOR SELECT USING (auth.uid() = 
        (SELECT user_id FROM public.budgets WHERE id = budget_category_limits.budget_id)
    );

CREATE POLICY "Users can manage own budget category limits" ON public.budget_category_limits
    FOR ALL USING (auth.uid() = 
        (SELECT user_id FROM public.budgets WHERE id = budget_category_limits.budget_id)
    );

-- Update income_streams policies
DROP POLICY IF EXISTS "Users can view own income streams" ON public.income_streams;
DROP POLICY IF EXISTS "Users can manage own income streams" ON public.income_streams;

CREATE POLICY "Users can view own income streams" ON public.income_streams
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own income streams" ON public.income_streams
    FOR ALL USING (auth.uid() = user_id);

-- Update categories policies
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;

CREATE POLICY "Users can view own categories" ON public.categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON public.categories
    FOR ALL USING (auth.uid() = user_id);

-- Update sub_categories policies
DROP POLICY IF EXISTS "Users can view own sub_categories" ON public.sub_categories;
DROP POLICY IF EXISTS "Users can manage own sub_categories" ON public.sub_categories;

CREATE POLICY "Users can view own sub_categories" ON public.sub_categories
    FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM public.categories WHERE id = sub_categories.category_id)
    );

CREATE POLICY "Users can manage own sub_categories" ON public.sub_categories
    FOR ALL USING (
        auth.uid() = (SELECT user_id FROM public.categories WHERE id = sub_categories.category_id)
    );

-- Update onboarding_progress policies
DROP POLICY IF EXISTS "Users can view own onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Users can manage own onboarding progress" ON public.onboarding_progress;

CREATE POLICY "Users can view own onboarding progress" ON public.onboarding_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own onboarding progress" ON public.onboarding_progress
    FOR ALL USING (auth.uid() = user_id);

-- 5. Update merchant_rules policies (if they exist)
-- First, ensure merchant_rules has user_id column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'merchant_rules' 
        AND column_name = 'user_id'
    ) THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own merchant rules" ON public.merchant_rules;
        DROP POLICY IF EXISTS "Users can manage own merchant rules" ON public.merchant_rules;
        
        -- Recreate policies with direct user_id reference
        CREATE POLICY "Users can view own merchant rules" ON public.merchant_rules
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can manage own merchant rules" ON public.merchant_rules
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Update the trigger function to remove the problematic trigger
DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;

-- 7. Create a simpler trigger for onboarding initialization
CREATE OR REPLACE FUNCTION public.handle_user_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize onboarding progress for new users
    INSERT INTO public.onboarding_progress (user_id, current_phase)
    VALUES (NEW.user_id, 1);
    
    -- Initialize default budgets for new users
    INSERT INTO public.budgets (user_id, name, start_date, budget_type)
    VALUES 
        (NEW.user_id, 'Primary', CURRENT_DATE, 'primary'),
        (NEW.user_id, 'Special', CURRENT_DATE, 'special');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recreate the trigger
CREATE TRIGGER on_user_profile_created
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_profile_creation();

-- 9. Verification
SELECT 'RLS recursion fix completed successfully' as status;
