-- Migration for MiBudget Onboarding Experience
-- Adds tables and extensions for comprehensive user onboarding flow

-- 1. Extend user_profiles table with onboarding preferences and tracking
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS date_format VARCHAR(10) DEFAULT 'MM/DD/YYYY',
ADD COLUMN IF NOT EXISTS number_format VARCHAR(5) DEFAULT '1,234.56',
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS import_completed BOOLEAN DEFAULT FALSE;

-- 2. Update merchant_rules table to include display names
ALTER TABLE public.merchant_rules 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Ensure proper constraints for merchant_rules
ALTER TABLE public.merchant_rules 
ADD CONSTRAINT merchant_rules_user_id_clean_merchant_name_key 
UNIQUE(user_id, clean_merchant_name);

-- 3. Create income_streams table for recurring income management
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

-- 4. Create categories table for expense categorization
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$'), -- hex color validation
    is_system BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, name)
);

-- 5. Create sub_categories table for hierarchical categorization
CREATE TABLE IF NOT EXISTS public.sub_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(category_id, name)
);

-- 6. Create budgets table with support for Primary and Special budgets
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

-- 7. Create budget_accounts table for account management within budgets
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

-- 8. Create budget_category_limits table for spending limits
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

-- 9. Create onboarding_progress table for detailed progress tracking
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

-- 10. Enable Row Level Security (RLS) for all new tables
ALTER TABLE public.income_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_category_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies for income_streams
CREATE POLICY "Users can view own income streams" ON public.income_streams
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = income_streams.user_id));

CREATE POLICY "Users can manage own income streams" ON public.income_streams
    FOR ALL USING (auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = income_streams.user_id));

-- 12. Create RLS policies for categories
CREATE POLICY "Users can view own categories" ON public.categories
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = categories.user_id));

CREATE POLICY "Users can manage own categories" ON public.categories
    FOR ALL USING (auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = categories.user_id));

-- 13. Create RLS policies for sub_categories
CREATE POLICY "Users can view own sub_categories" ON public.sub_categories
    FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
            (SELECT user_id FROM public.categories WHERE id = sub_categories.category_id))
    );

CREATE POLICY "Users can manage own sub_categories" ON public.sub_categories
    FOR ALL USING (
        auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
            (SELECT user_id FROM public.categories WHERE id = sub_categories.category_id))
    );

-- 14. Create RLS policies for budgets
CREATE POLICY "Users can view own budgets" ON public.budgets
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = budgets.user_id));

CREATE POLICY "Users can manage own budgets" ON public.budgets
    FOR ALL USING (auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = budgets.user_id));

-- 15. Create RLS policies for budget_accounts
CREATE POLICY "Users can view own budget accounts" ON public.budget_accounts
    FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
            (SELECT user_id FROM public.budgets WHERE id = budget_accounts.budget_id))
    );

CREATE POLICY "Users can manage own budget accounts" ON public.budget_accounts
    FOR ALL USING (
        auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
            (SELECT user_id FROM public.budgets WHERE id = budget_accounts.budget_id))
    );

-- 16. Create RLS policies for budget_category_limits
CREATE POLICY "Users can view own budget category limits" ON public.budget_category_limits
    FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
            (SELECT user_id FROM public.budgets WHERE id = budget_category_limits.budget_id))
    );

CREATE POLICY "Users can manage own budget category limits" ON public.budget_category_limits
    FOR ALL USING (
        auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
            (SELECT user_id FROM public.budgets WHERE id = budget_category_limits.budget_id))
    );

-- 17. Create RLS policies for onboarding_progress
CREATE POLICY "Users can view own onboarding progress" ON public.onboarding_progress
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = onboarding_progress.user_id));

CREATE POLICY "Users can manage own onboarding progress" ON public.onboarding_progress
    FOR ALL USING (auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = onboarding_progress.user_id));

-- 18. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_income_streams_user_id ON public.income_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_income_streams_merchant_pattern ON public.income_streams(merchant_pattern);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_category_id ON public.sub_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_budget_type ON public.budgets(budget_type);
CREATE INDEX IF NOT EXISTS idx_budget_accounts_budget_id ON public.budget_accounts(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_category_limits_budget_id ON public.budget_category_limits(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_category_limits_category_id ON public.budget_category_limits(category_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);

-- 19. Create function to handle updated_at timestamp for all new tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 20. Create triggers for updated_at timestamps
CREATE TRIGGER update_income_streams_updated_at
    BEFORE UPDATE ON public.income_streams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sub_categories_updated_at
    BEFORE UPDATE ON public.sub_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_accounts_updated_at
    BEFORE UPDATE ON public.budget_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_category_limits_updated_at
    BEFORE UPDATE ON public.budget_category_limits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_updated_at
    BEFORE UPDATE ON public.onboarding_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 21. Create function to initialize default budgets for new users
CREATE OR REPLACE FUNCTION public.initialize_default_budgets(p_user_id UUID)
RETURNS TABLE(budget_id UUID, budget_name TEXT, budget_type TEXT) AS $$
DECLARE
    primary_budget_id UUID;
    special_budget_id UUID;
    current_date DATE := CURRENT_DATE;
BEGIN
    -- Create Primary budget
    INSERT INTO public.budgets (user_id, name, start_date, budget_type)
    VALUES (p_user_id, 'Primary', current_date, 'primary')
    RETURNING id INTO primary_budget_id;
    
    -- Create Special budget
    INSERT INTO public.budgets (user_id, name, start_date, budget_type)
    VALUES (p_user_id, 'Special', current_date, 'special')
    RETURNING id INTO special_budget_id;
    
    -- Return the created budgets
    RETURN QUERY
    SELECT primary_budget_id, 'Primary', 'primary'
    UNION ALL
    SELECT special_budget_id, 'Special', 'special';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 22. Create function to initialize onboarding progress for new users
CREATE OR REPLACE FUNCTION public.initialize_onboarding_progress(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    progress_id UUID;
BEGIN
    INSERT INTO public.onboarding_progress (user_id, current_phase)
    VALUES (p_user_id, 1)
    RETURNING id INTO progress_id;
    
    RETURN progress_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 23. Create trigger to automatically initialize onboarding progress for new users
CREATE OR REPLACE FUNCTION public.handle_user_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize onboarding progress
    PERFORM public.initialize_onboarding_progress(NEW.id);
    
    -- Initialize default budgets
    PERFORM public.initialize_default_budgets(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 24. Create trigger for user profile creation
DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;
CREATE TRIGGER on_user_profile_created
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_profile_creation();

-- 25. Verification queries
SELECT 'Onboarding schema migration completed successfully' as status;
SELECT COUNT(*) as income_streams_count FROM public.income_streams;
SELECT COUNT(*) as categories_count FROM public.categories;
SELECT COUNT(*) as budgets_count FROM public.budgets;
SELECT COUNT(*) as onboarding_progress_count FROM public.onboarding_progress;
