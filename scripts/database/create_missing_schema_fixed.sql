-- MiBudget Schema Setup - Fixed Version
-- This script will create missing tables, RLS policies, and triggers safely

-- Function to handle updated_at timestamp (create if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Create categories table
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

-- 2. Create sub_categories table
CREATE TABLE IF NOT EXISTS public.sub_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(category_id, name)
);

-- 3. Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'weekly', 'yearly', 'quarterly')),
    start_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    budget_type VARCHAR(20) DEFAULT 'primary' CHECK (budget_type IN ('primary', 'special', 'custom')),
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, name, budget_type, year)
);

-- 4. Create budget_accounts table
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

-- 5. Create budget_category_limits table
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

-- 6. Create income_streams table
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

-- 7. Create onboarding_progress table
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

-- Enable RLS for new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_category_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Users can view own categories') THEN
        CREATE POLICY "Users can view own categories" ON public.categories
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Users can manage own categories') THEN
        CREATE POLICY "Users can manage own categories" ON public.categories
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create RLS policies for sub_categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_categories' AND policyname = 'Users can view own sub_categories') THEN
        CREATE POLICY "Users can view own sub_categories" ON public.sub_categories
            FOR SELECT USING (
                auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
                    (SELECT user_id FROM public.categories WHERE id = sub_categories.category_id))
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_categories' AND policyname = 'Users can manage own sub_categories') THEN
        CREATE POLICY "Users can manage own sub_categories" ON public.sub_categories
            FOR ALL USING (
                auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
                    (SELECT user_id FROM public.categories WHERE id = sub_categories.category_id))
            );
    END IF;
END $$;

-- Create RLS policies for budgets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'Users can view own budgets') THEN
        CREATE POLICY "Users can view own budgets" ON public.budgets
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'Users can manage own budgets') THEN
        CREATE POLICY "Users can manage own budgets" ON public.budgets
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create RLS policies for budget_accounts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budget_accounts' AND policyname = 'Users can view own budget_accounts') THEN
        CREATE POLICY "Users can view own budget_accounts" ON public.budget_accounts
            FOR SELECT USING (
                auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
                    (SELECT user_id FROM public.budgets WHERE id = budget_accounts.budget_id))
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budget_accounts' AND policyname = 'Users can manage own budget_accounts') THEN
        CREATE POLICY "Users can manage own budget_accounts" ON public.budget_accounts
            FOR ALL USING (
                auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
                    (SELECT user_id FROM public.budgets WHERE id = budget_accounts.budget_id))
            );
    END IF;
END $$;

-- Create RLS policies for budget_category_limits
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budget_category_limits' AND policyname = 'Users can view own budget_category_limits') THEN
        CREATE POLICY "Users can view own budget_category_limits" ON public.budget_category_limits
            FOR SELECT USING (
                auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
                    (SELECT user_id FROM public.budgets WHERE id = budget_category_limits.budget_id))
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budget_category_limits' AND policyname = 'Users can manage own budget_category_limits') THEN
        CREATE POLICY "Users can manage own budget_category_limits" ON public.budget_category_limits
            FOR ALL USING (
                auth.uid() = (SELECT user_id FROM public.user_profiles WHERE id = 
                    (SELECT user_id FROM public.budgets WHERE id = budget_category_limits.budget_id))
            );
    END IF;
END $$;

-- Create RLS policies for income_streams
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income_streams' AND policyname = 'Users can view own income_streams') THEN
        CREATE POLICY "Users can view own income_streams" ON public.income_streams
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income_streams' AND policyname = 'Users can manage own income_streams') THEN
        CREATE POLICY "Users can manage own income_streams" ON public.income_streams
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create RLS policies for onboarding_progress
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_progress' AND policyname = 'Users can view own onboarding_progress') THEN
        CREATE POLICY "Users can view own onboarding_progress" ON public.onboarding_progress
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_progress' AND policyname = 'Users can manage own onboarding_progress') THEN
        CREATE POLICY "Users can manage own onboarding_progress" ON public.onboarding_progress
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create triggers for updated_at (using DO blocks to check existence)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_categories_updated_at' AND event_object_table = 'categories') THEN
        CREATE TRIGGER update_categories_updated_at
            BEFORE UPDATE ON public.categories
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_sub_categories_updated_at' AND event_object_table = 'sub_categories') THEN
        CREATE TRIGGER update_sub_categories_updated_at
            BEFORE UPDATE ON public.sub_categories
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_budgets_updated_at' AND event_object_table = 'budgets') THEN
        CREATE TRIGGER update_budgets_updated_at
            BEFORE UPDATE ON public.budgets
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_budget_category_limits_updated_at' AND event_object_table = 'budget_category_limits') THEN
        CREATE TRIGGER update_budget_category_limits_updated_at
            BEFORE UPDATE ON public.budget_category_limits
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_income_streams_updated_at' AND event_object_table = 'income_streams') THEN
        CREATE TRIGGER update_income_streams_updated_at
            BEFORE UPDATE ON public.income_streams
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_onboarding_progress_updated_at' AND event_object_table = 'onboarding_progress') THEN
        CREATE TRIGGER update_onboarding_progress_updated_at
            BEFORE UPDATE ON public.onboarding_progress
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Verification
SELECT 'MiBudget missing schema created successfully' as status;
SELECT COUNT(*) as categories_count FROM public.categories;
SELECT COUNT(*) as budgets_count FROM public.budgets;
SELECT COUNT(*) as budget_category_limits_count FROM public.budget_category_limits;
