-- Minimal fix for onboarding - only add new columns and tables, don't touch existing user_profiles policies

-- 1. Add new columns to user_profiles (if they don't exist)
DO $$
BEGIN
    -- Add date_format column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'date_format'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN date_format VARCHAR(10) DEFAULT 'MM/DD/YYYY';
    END IF;

    -- Add number_format column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'number_format'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN number_format VARCHAR(5) DEFAULT '1,234.56';
    END IF;

    -- Add onboarding_step column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'onboarding_step'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN onboarding_step INTEGER DEFAULT 0;
    END IF;

    -- Add import_completed column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'import_completed'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN import_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create new tables (only if they don't exist)
CREATE TABLE IF NOT EXISTS public.income_streams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    merchant_pattern TEXT,
    expected_amount DECIMAL(12,2),
    frequency VARCHAR(20) DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'bi-weekly', 'weekly', 'yearly', 'quarterly')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    is_system BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.sub_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(category_id, name)
);

CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'weekly', 'yearly', 'quarterly')),
    start_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    budget_type VARCHAR(20) DEFAULT 'primary' CHECK (budget_type IN ('primary', 'special', 'custom')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, name, budget_type)
);

CREATE TABLE IF NOT EXISTS public.budget_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
    account_name TEXT NOT NULL,
    account_type VARCHAR(20) CHECK (account_type IN ('checking', 'savings', 'credit', 'investment', 'cash')),
    opening_balance DECIMAL(12,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(budget_id, account_name)
);

CREATE TABLE IF NOT EXISTS public.budget_category_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    limit_amount DECIMAL(12,2) NOT NULL,
    alert_threshold DECIMAL(5,2) DEFAULT 80.00 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(budget_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_phase INTEGER DEFAULT 1 CHECK (current_phase >= 1 AND current_phase <= 7),
    completed_phases TEXT[] DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    import_summary JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Enable RLS for new tables
ALTER TABLE public.income_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_category_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for new tables (using direct auth.uid() = user_id)
CREATE POLICY IF NOT EXISTS "Users can view own income streams" ON public.income_streams
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage own income streams" ON public.income_streams
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own categories" ON public.categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage own categories" ON public.categories
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own sub_categories" ON public.sub_categories
    FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM public.categories WHERE id = sub_categories.category_id)
    );

CREATE POLICY IF NOT EXISTS "Users can manage own sub_categories" ON public.sub_categories
    FOR ALL USING (
        auth.uid() = (SELECT user_id FROM public.categories WHERE id = sub_categories.category_id)
    );

CREATE POLICY IF NOT EXISTS "Users can view own budgets" ON public.budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage own budgets" ON public.budgets
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own budget accounts" ON public.budget_accounts
    FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM public.budgets WHERE id = budget_accounts.budget_id)
    );

CREATE POLICY IF NOT EXISTS "Users can manage own budget accounts" ON public.budget_accounts
    FOR ALL USING (
        auth.uid() = (SELECT user_id FROM public.budgets WHERE id = budget_accounts.budget_id)
    );

CREATE POLICY IF NOT EXISTS "Users can view own budget category limits" ON public.budget_category_limits
    FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM public.budgets WHERE id = budget_category_limits.budget_id)
    );

CREATE POLICY IF NOT EXISTS "Users can manage own budget category limits" ON public.budget_category_limits
    FOR ALL USING (
        auth.uid() = (SELECT user_id FROM public.budgets WHERE id = budget_category_limits.budget_id)
    );

CREATE POLICY IF NOT EXISTS "Users can view own onboarding progress" ON public.onboarding_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage own onboarding progress" ON public.onboarding_progress
    FOR ALL USING (auth.uid() = user_id);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_income_streams_user_id ON public.income_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_category_id ON public.sub_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);

-- 6. Create helper functions
CREATE OR REPLACE FUNCTION public.initialize_default_budgets(p_user_id UUID)
RETURNS TABLE(budget_id UUID, budget_name TEXT, budget_type TEXT) AS $$
DECLARE
    primary_budget_id UUID;
    special_budget_id UUID;
BEGIN
    INSERT INTO public.budgets (user_id, name, start_date, budget_type)
    VALUES (p_user_id, 'Primary', CURRENT_DATE, 'primary')
    RETURNING id INTO primary_budget_id;
    
    INSERT INTO public.budgets (user_id, name, start_date, budget_type)
    VALUES (p_user_id, 'Special', CURRENT_DATE, 'special')
    RETURNING id INTO special_budget_id;
    
    RETURN QUERY
    SELECT primary_budget_id, 'Primary', 'primary'
    UNION ALL
    SELECT special_budget_id, 'Special', 'special';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create simple trigger for new users (no recursion)
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.onboarding_progress (user_id, current_phase)
    VALUES (NEW.user_id, 1);
    
    PERFORM public.initialize_default_budgets(NEW.user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger (only if it doesn't exist)
DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;
CREATE TRIGGER on_user_profile_created
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_onboarding();

-- 9. Verification
SELECT 'Minimal onboarding fix completed successfully' as status;
