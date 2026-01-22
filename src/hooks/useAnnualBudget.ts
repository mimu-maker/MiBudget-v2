import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BudgetCategory {
  id: string;
  name: string;
  category_group: 'income' | 'expenditure' | 'klintemarken' | 'special';
  display_order: number;
  budget_amount: number;
  alert_threshold: number;
  spent: number;
  remaining: number;
  remaining_percent: number;
  sub_categories: BudgetSubCategory[];
}

export interface BudgetSubCategory {
  id: string;
  name: string;
  budget_amount: number;
  spent: number;
  is_active: boolean;
  first_used_date?: string;
}

export interface AnnualBudget {
  id: string;
  name: string;
  year: number;
  budget_type: string;
  start_date: string;
  is_active: boolean;
  categories: BudgetCategory[];
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  category_groups: {
    income: BudgetCategory[];
    expenditure: BudgetCategory[];
    klintemarken: BudgetCategory[];
    special: BudgetCategory[];
  };
}

export const useAnnualBudget = (year?: number) => {
  const [budget, setBudget] = useState<AnnualBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, AnnualBudget | null>>({});
  const { user } = useAuth();

  const fetchBudget = useCallback(async (budgetYear?: number) => {
    try {
      setLoading(true);
      setError(null);

      // Create cache key
      const cacheKey = `budget_${budgetYear || 2025}_${user?.id}`;
      
      // Check cache first
      if (cache[cacheKey]) {
        console.log('Using cached budget data for year:', budgetYear || 2025);
        setBudget(cache[cacheKey]);
        setLoading(false);
        return;
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Current user:', user.id, user.email);

      // Get user profile - try multiple approaches
      let profile = null;
      
      // Method 1: Direct user_id lookup
      const { data: profile1, error: error1 } = await supabase
        .from('user_profiles')
        .select('id, user_id, email')
        .eq('user_id', user.id)
        .single();

      if (!error1 && profile1) {
        profile = profile1;
        console.log('Found profile via user_id:', profile);
      } else {
        console.log('Method 1 failed:', error1);
        
        // Method 2: Email lookup
        const { data: profile2, error: error2 } = await supabase
          .from('user_profiles')
          .select('id, user_id, email')
          .eq('email', user.email || '')
          .single();

        if (!error2 && profile2) {
          profile = profile2;
          console.log('Found profile via email:', profile);
        } else {
          console.log('Method 2 failed:', error2);
          
          // Method 3: Get any profile (for debugging)
          const { data: allProfiles, error: error3 } = await supabase
            .from('user_profiles')
            .select('id, user_id, email')
            .limit(5);

          console.log('All profiles in database:', allProfiles, error3);
          throw new Error(`User profile not found. Tried user_id lookup and email lookup. Auth user: ${user.id} / ${user.email}`);
        }
      }

      // Get unified budget for the specified year (default to 2025)
      const targetYear = budgetYear || 2025;
      
      let budgetData: any;
      
      const { data: unifiedBudget, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', profile.id)
        .eq('year', targetYear)
        .eq('budget_type', 'unified')
        .single();

      if (budgetError) {
        console.log('Unified budget not found, trying primary budget:', budgetError);
        // Fallback to primary budget for backward compatibility
        const { data: primaryBudget, error: primaryError } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', profile.id)
          .eq('year', targetYear)
          .eq('budget_type', 'primary')
          .single();
          
        if (primaryError) throw primaryError;
        if (!primaryBudget) throw new Error(`No budget found for year ${targetYear}`);
        
        budgetData = primaryBudget;
      } else {
        budgetData = unifiedBudget;
      }

      console.log('Found budget:', budgetData);

      // Use the new hierarchical categories function
      const { data: hierarchicalCategories, error: hierarchicalError } = await supabase
        .rpc('get_hierarchical_categories', { p_budget_id: budgetData.id });

      if (hierarchicalError) {
        console.error('Hierarchical categories error:', hierarchicalError);
        setError(hierarchicalError instanceof Error ? hierarchicalError.message : 'Failed to fetch hierarchical categories');
        setLoading(false);
        return;
      }
      console.log('Found hierarchical categories:', hierarchicalCategories?.length || 0, 'items');

      // Build categories from hierarchical data
      const categories: BudgetCategory[] = (hierarchicalCategories || []).map((item: any) => ({
        id: item.category_id,
        name: item.category_name,
        category_group: item.category_group,
        display_order: item.category_order,
        budget_amount: item.budget_amount,
        alert_threshold: 0, // Default value
        spent: item.spent_amount,
        remaining: item.remaining_amount,
        remaining_percent: item.budget_amount > 0 ? (item.remaining_amount / item.budget_amount) * 100 : 0,
        sub_categories: (item.sub_categories || []).map((sub: any) => ({
          id: sub.id,
          name: sub.name,
          budget_amount: sub.budget_amount ?? 0,
          spent: sub.spent,
          is_active: true,
          first_used_date: undefined
        }))
      }));

      // Group categories by category_group
      const categoryGroups = {
        income: categories.filter(cat => cat.category_group === 'income'),
        expenditure: categories.filter(cat => cat.category_group === 'expenditure'),
        klintemarken: categories.filter(cat => cat.category_group === 'klintemarken'),
        special: categories.filter(cat => cat.category_group === 'special')
      };

      const totalBudget = categories.reduce((sum, cat) => sum + cat.budget_amount, 0);
      const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
      const totalRemaining = totalBudget - totalSpent;

      const annualBudget: AnnualBudget = {
        id: budgetData.id,
        name: budgetData.name,
        year: budgetData.year,
        budget_type: budgetData.budget_type,
        start_date: budgetData.start_date,
        is_active: budgetData.is_active,
        categories,
        total_budget: totalBudget,
        total_spent: totalSpent,
        total_remaining: totalRemaining,
        category_groups: categoryGroups
      };

      setBudget(annualBudget);
    } catch (err) {
      console.error('Error fetching annual budget:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch budget');
    } finally {
      setLoading(false);
    }
  }, [year, user?.id]);

  useEffect(() => {
    fetchBudget(year);
  }, [year, user?.id]);

  const refreshBudget = useCallback(() => {
    fetchBudget(year);
  }, [year, fetchBudget]);

  return {
    budget,
    loading,
    error,
    fetchBudget,
    refreshBudget
  };
};

// Export a hook to get all categories for Settings page
export const useCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) throw new Error('User profile not found');

        // Get categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*, sub_categories(id, name)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: true });

        if (categoriesError) throw categoriesError;

        setCategories(categoriesData || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error
  };
};
