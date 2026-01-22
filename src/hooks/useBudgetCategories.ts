import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_BUDGET_NAME = 'Primary 2025';
const DEFAULT_BUDGET_YEAR = 2025;

type CategoryQueryKey = (string | number | undefined)[];

type SubCategoryRecord = {
  id: string;
  name: string;
  display_order?: number;
  budget_amount?: number;
};

export interface BudgetCategoryRecord {
  id: string;
  name: string;
  category_group?: string;
  display_order?: number;
  is_system?: boolean;
  budget_amount?: number;
  sub_categories: SubCategoryRecord[];
}

const CATEGORY_QUERY_KEY = (profileId?: string, budgetId?: string | null): CategoryQueryKey => [
  'budget-categories',
  profileId,
  budgetId || 'default'
];

const BUDGET_QUERY_KEY = (profileId?: string): CategoryQueryKey => [
  'default-budget',
  profileId
];

const fetchOrCreateDefaultBudget = async (profileId: string) => {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', profileId)
    .eq('name', DEFAULT_BUDGET_NAME)
    .eq('year', DEFAULT_BUDGET_YEAR)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('budgets')
    .insert({
      user_id: profileId,
      name: DEFAULT_BUDGET_NAME,
      year: DEFAULT_BUDGET_YEAR,
      budget_type: 'primary',
      period_type: 'monthly',
      start_date: `${DEFAULT_BUDGET_YEAR}-01-01`,
      is_active: true
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted;
};

const fetchCategories = async (profileId: string, budgetId?: string | null): Promise<BudgetCategoryRecord[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      category_group,
      display_order,
      is_system,
      sub_categories (
        id,
        name,
        display_order,
        budget_amount
      )
    `)
    .eq('user_id', profileId)
    .order('display_order', { ascending: true });

  if (error) {
    throw error;
  }

  const categories = data || [];

  let categoryBudgets: Record<string, number> = {};

  if (budgetId) {
    const { data: limitsData, error: limitsError } = await supabase
      .from('budget_category_limits')
      .select('category_id, limit_amount')
      .eq('budget_id', budgetId);

    if (limitsError) {
      throw limitsError;
    }

    limitsData?.forEach((limit) => {
      categoryBudgets[limit.category_id] = Number(limit.limit_amount ?? 0);
    });
  }

  return categories.map((category) => ({
    ...category,
    budget_amount: categoryBudgets[category.id] ?? 0,
    sub_categories: (category.sub_categories || [])
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((sub) => ({
        ...sub,
        budget_amount: sub.budget_amount ?? 0
      }))
  }));
};

const useDefaultBudget = (profileId?: string) => {
  return useQuery({
    queryKey: BUDGET_QUERY_KEY(profileId),
    queryFn: async () => {
      if (!profileId) throw new Error('Missing profile id');
      return fetchOrCreateDefaultBudget(profileId);
    },
    enabled: !!profileId
  });
};

export const useBudgetCategoriesData = (profileId?: string, budgetId?: string | null) => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEY(profileId, budgetId),
    queryFn: async () => {
      if (!profileId) throw new Error('Missing profile id');
      return fetchCategories(profileId, budgetId);
    },
    enabled: !!profileId
  });
};

const useCategoryMutations = (profileId?: string, budgetId?: string | null) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY(profileId, budgetId) });
  };

  const addCategory = useMutation({
    mutationFn: async ({ name, categoryGroup }: { name: string; categoryGroup?: string }) => {
      if (!profileId) throw new Error('Missing profile id');
      const existing = queryClient.getQueryData<BudgetCategoryRecord[]>(CATEGORY_QUERY_KEY(profileId, budgetId)) || [];
      const displayOrder = existing.length;

      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: profileId,
          name,
          category_group: categoryGroup || 'expenditure',
          display_order: displayOrder
        });

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate
  });

  const renameCategory = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', categoryId);

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate
  });

  const deleteCategory = useMutation({
    mutationFn: async ({ categoryId }: { categoryId: string }) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate
  });

  const reorderCategories = useMutation({
    mutationFn: async ({ orderedIds }: { orderedIds: string[] }) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase
            .from('categories')
            .update({ display_order: index })
            .eq('id', id)
        )
      );
    },
    onSuccess: invalidate
  });

  const addSubCategory = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const categories = queryClient.getQueryData<BudgetCategoryRecord[]>(CATEGORY_QUERY_KEY(profileId, budgetId)) || [];
      const category = categories.find((cat) => cat.id === categoryId);
      const displayOrder = category?.sub_categories.length || 0;

      const { error } = await supabase
        .from('sub_categories')
        .insert({
          category_id: categoryId,
          name,
          display_order: displayOrder
        });

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate
  });

  const renameSubCategory = useMutation({
    mutationFn: async ({ subCategoryId, name }: { subCategoryId: string; name: string }) => {
      const { error } = await supabase
        .from('sub_categories')
        .update({ name })
        .eq('id', subCategoryId);

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate
  });

  const deleteSubCategory = useMutation({
    mutationFn: async ({ subCategoryId }: { subCategoryId: string }) => {
      const { error } = await supabase
        .from('sub_categories')
        .delete()
        .eq('id', subCategoryId);

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate
  });

  const reorderSubCategories = useMutation({
    mutationFn: async ({
      categoryId,
      orderedIds
    }: {
      categoryId: string;
      orderedIds: string[];
    }) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase
            .from('sub_categories')
            .update({ display_order: index })
            .eq('id', id)
            .eq('category_id', categoryId)
        )
      );
    },
    onSuccess: invalidate
  });

  const moveSubCategory = useMutation({
    mutationFn: async ({
      subCategoryId,
      targetCategoryId,
      newName
    }: {
      subCategoryId: string;
      targetCategoryId: string;
      newName?: string;
    }) => {
      const updates: Record<string, any> = {
        category_id: targetCategoryId
      };

      if (newName) {
        updates.name = newName;
      }

      const { error } = await supabase
        .from('sub_categories')
        .update(updates)
        .eq('id', subCategoryId);

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate
  });

  const updateCategoryBudget = useMutation({
    mutationFn: async ({ categoryId, amount }: { categoryId: string; amount: number }) => {
      if (!budgetId) {
        throw new Error('Missing budget id');
      }

      const { error } = await supabase
        .from('budget_category_limits')
        .upsert({
          budget_id: budgetId,
          category_id: categoryId,
          limit_amount: amount,
          alert_threshold: 80
        }, {
          onConflict: 'budget_id,category_id'
        });

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate
  });

  const updateSubCategoryBudget = useMutation({
    mutationFn: async ({ subCategoryId, amount }: { subCategoryId: string; amount: number }) => {
      const { error } = await supabase
        .from('sub_categories')
        .update({ budget_amount: amount })
        .eq('id', subCategoryId);

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidate
  });

  return {
    addCategory,
    renameCategory,
    deleteCategory,
    reorderCategories,
    addSubCategory,
    renameSubCategory,
    deleteSubCategory,
    reorderSubCategories,
    moveSubCategory,
    updateCategoryBudget,
    updateSubCategoryBudget
  };
};

export const useBudgetCategoryActions = () => {
  const { userProfile } = useAuth();
  const profileId = userProfile?.id;
  const { data: budget } = useDefaultBudget(profileId);

  return useCategoryMutations(profileId, budget?.id ?? null);
};

export const useBudgetCategoryActionsForBudget = (budgetId?: string | null) => {
  const { userProfile } = useAuth();
  const profileId = userProfile?.id;

  return useCategoryMutations(profileId, budgetId ?? null);
};

export const useBudgetCategoriesManager = () => {
  const { userProfile } = useAuth();
  const profileId = userProfile?.id;
  const { data: budget, isLoading: budgetLoading, error: budgetError } = useDefaultBudget(profileId);
  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError
  } = useBudgetCategoriesData(profileId, budget?.id ?? null);

  const mutations = useCategoryMutations(profileId, budget?.id ?? null);

  return {
    categories: categories || [],
    budgetId: budget?.id ?? null,
    isLoading: budgetLoading || categoriesLoading,
    error: budgetError || categoriesError,
    ...mutations
  };
};
