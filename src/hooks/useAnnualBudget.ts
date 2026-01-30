import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BudgetCategory {
  id: string;
  name: string;
  category_group: 'income' | 'expenditure' | 'klintemarken' | 'special';
  display_order: number;
  icon?: string;
  color?: string;
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
  remaining: number;
  is_active: boolean;
  last_year_data?: { budget: number, spent: number };
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
  const { user } = useAuth();

  const fetchBudget = useCallback(async (budgetYear?: number) => {
    // Only show loading spinner on initial load, not on refreshes
    if (!budget) {
      setLoading(true);
    }
    setError(null);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching budget for year:', budgetYear || 2025, 'user:', user.id);

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
        .maybeSingle();

      if (budgetError || !unifiedBudget) {
        if (budgetError) console.warn('Unified search error:', budgetError.message);

        // Fallback to primary budget
        const { data: primaryBudget, error: primaryError } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', profile.id)
          .eq('year', targetYear)
          .eq('budget_type', 'primary')
          .maybeSingle();

        if (primaryError) throw primaryError;
        if (!primaryBudget) throw new Error(`No budget found for year ${targetYear}`);

        budgetData = primaryBudget;
      } else {
        budgetData = unifiedBudget;
      }

      console.log('Found budget:', budgetData);

      // 1. Fetch ALL categories and subcategories first (the master list)
      const { data: allCategories, error: allError } = await supabase
        .from('categories')
        .select('*, sub_categories(id, name, display_order)')
        .eq('user_id', profile.id)
        .order('display_order', { ascending: true });

      if (allError) throw allError;

      // 2. Fetch hierarchical budget data (actuals and limits)
      const { data: hierarchicalCategories, error: hierarchicalError } = await supabase
        .rpc('get_hierarchical_categories', { p_budget_id: budgetData.id });

      // Fetch last year hierarchical data if exists
      let lastYearHierarchicalMap: Record<string, any> = {};
      const { data: lastYearBudget } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', profile.id)
        .eq('year', targetYear - 1)
        .eq('budget_type', budgetData.budget_type)
        .maybeSingle();

      if (lastYearBudget) {
        const { data: lastYearHierarchical } = await supabase
          .rpc('get_hierarchical_categories', { p_budget_id: lastYearBudget.id });

        (lastYearHierarchical || []).forEach((item: any) => {
          lastYearHierarchicalMap[item.category_id] = item;
        });
      }

      // Map hierarchical data for easy lookup
      const hierarchicalMap: Record<string, any> = {};
      (hierarchicalCategories || []).forEach((item: any) => {
        hierarchicalMap[item.category_id] = item;
      });

      // 3. Build the combined list
      const categories: BudgetCategory[] = (allCategories || []).map((cat: any) => {
        const hCat = hierarchicalMap[cat.id];

        const subCategories = (cat.sub_categories || [])
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((sub: any) => {
            const hSub = (hCat?.sub_categories || []).find((s: any) => s.id === sub.id);
            const subBudget = hSub?.budget_amount ?? 0;
            const subSpent = hSub?.spent ?? 0;
            const isActive = hSub ? (hSub.is_active !== false) : true;

            // Map last year's data for comparison
            const lastYearCat = lastYearHierarchicalMap[cat.id];
            const lastYearSub = (lastYearCat?.sub_categories || []).find((s: any) => s.id === sub.id);
            const lastYearData = lastYearSub ? {
              budget: lastYearSub.budget_amount,
              spent: lastYearSub.spent
            } : undefined;

            return {
              id: sub.id,
              name: sub.name,
              budget_amount: subBudget,
              spent: subSpent,
              remaining: subBudget - subSpent,
              is_active: isActive,
              last_year_data: lastYearData,
              first_used_date: undefined
            };
          })
          .filter(sub => sub.is_active || sub.spent !== 0);

        const subTotalBudget = subCategories.reduce((sum, sub) => sum + sub.budget_amount, 0);
        const subTotalSpent = subCategories.reduce((sum, sub) => sum + sub.spent, 0);

        return {
          id: cat.id,
          name: cat.name,
          category_group: cat.category_group,
          display_order: cat.display_order,
          icon: cat.icon,
          color: cat.color,
          budget_amount: subTotalBudget,
          alert_threshold: 0,
          spent: subTotalSpent,
          remaining: subTotalBudget - subTotalSpent,
          remaining_percent: subTotalBudget > 0 ? ((subTotalBudget - subTotalSpent) / subTotalBudget) * 100 : 0,
          sub_categories: subCategories
        };
      }).filter(cat => cat.sub_categories.length > 0);

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
      return annualBudget;
    } catch (err) {
      console.error('Error fetching annual budget:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch budget');
      return null;
    } finally {
      setLoading(false);
    }
  }, [year, user?.id]);

  useEffect(() => {
    fetchBudget(year);
  }, [year, user?.id]);

  const refreshBudget = useCallback(() => {
    return fetchBudget(year);
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
