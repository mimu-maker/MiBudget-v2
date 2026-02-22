import { useState, useMemo } from 'react';
import { FutureTransaction, NewTransactionForm, ProjectionData, RecurringInterval } from '@/types/projection';
import ProjectionChart from '@/components/Projection/ProjectionChart';
import AddTransactionFormV2 from '@/components/Projection/AddTransactionFormV2';
import IncomeTransactionsTable from '@/components/Projection/IncomeTransactionsTable';
import ExpenseTransactionsTable from '@/components/Projection/ExpenseTransactionsTable';
import SlushFundTransactionsTable from '@/components/Projection/SlushFundTransactionsTable';
import SlushFundAddDialog from '@/components/Projection/SlushFundAddDialog';
import ProjectedIncomeTable from '@/components/Projection/ProjectedIncomeTable';
import PasteDataDialog from '@/components/Projection/PasteDataDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp, Clock, History, TrendingUp, TrendingDown, Scale, ArrowUpRight, ArrowDownRight, Wallet, PieChart, Plus, Trash2, BarChart3 } from 'lucide-react';
import CreateScenarioDialog from '@/components/Projection/CreateScenarioDialog';
import SuggestProjectionsWizard from '@/components/Projection/SuggestProjectionsWizard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatUtils';
import { useAnnualBudget, BudgetCategory, BudgetSubCategory } from '@/hooks/useAnnualBudget';
import { useBudgetCategoryActionsForBudget } from '@/hooks/useBudgetCategories';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { BudgetTable } from '@/components/Budget/BudgetTable';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const Projection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteDialogType, setPasteDialogType] = useState<'income' | 'expense'>('income');
  const [showLegacy, setShowLegacy] = useState(false);
  const [showPastProjections, setShowPastProjections] = useState(false);
  const [showCreateScenario, setShowCreateScenario] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [disabledIncomeStreams, setDisabledIncomeStreams] = useState<Set<string>>(new Set());
  const [slushDialogOpen, setSlushDialogOpen] = useState(false);
  const [slushEditingTx, setSlushEditingTx] = useState<FutureTransaction | null>(null);

  const currentYear = new Date().getFullYear();
  const availableYearsList = [currentYear, currentYear + 1, currentYear + 2];
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  // Budget Hooks
  const { budget, loading: budgetLoading, refreshBudget } = useAnnualBudget(parseInt(selectedYear));
  const { updateSubCategoryBudget: updateSubCategoryBudgetMutation } = useBudgetCategoryActionsForBudget(budget?.id);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 1. Fetch ALL Projections (including Master)
  const { data: allProjectionsRaw = [], isLoading: isLoadingProjections } = useQuery<any[]>({
    queryKey: ['projections', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projections' as any)
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Map merchant -> source for frontend consistently
  const allProjections = useMemo(() =>
    allProjectionsRaw.map((p: any) => ({
      ...p,
      source: p.merchant || p.source // handle both just in case
    })),
    [allProjectionsRaw]
  );

  const projections = useMemo(() => {
    if (activeScenarioId) {
      return allProjections.filter(p => p.scenario_id === activeScenarioId);
    }
    return allProjections.filter(p => !p.scenario_id);
  }, [allProjections, activeScenarioId]);

  const masterProjectionsRaw = useMemo(() =>
    allProjections.filter(p => !p.scenario_id),
    [allProjections]
  );

  // 1.1 Fetch Scenarios
  const { data: scenarios = [] } = useQuery<any[]>({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Fetch Actual Transactions (Complete only)
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', 'complete'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'Complete')
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const [newTransaction, setNewTransaction] = useState<NewTransactionForm>({
    date: new Date().toISOString().slice(0, 10),
    source: '',
    amount: '',
    category: 'Food',
    stream: '',
    planned: true,
    recurring: 'Monthly',
    description: ''
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const expandAll = (categories: string[]) => setExpandedCategories(new Set(categories));
  const collapseAll = () => setExpandedCategories(new Set());

  const handleUpdateBudget = async (parentCategory: BudgetCategory, subCategory: BudgetSubCategory, value: string, type: 'annual' | 'monthly' | 'percent', currentKey: string) => {
    try {
      const numValue = parseFloat(value) || 0;
      let newMonthlyAmount = subCategory.budget_amount || 0;
      const totalIncome = budget?.category_groups?.income?.reduce((sum, item) => sum + item.budget_amount, 0) || 0;

      switch (type) {
        case 'annual': newMonthlyAmount = numValue / 12; break;
        case 'monthly': newMonthlyAmount = numValue; break;
        case 'percent': {
          const effectiveIncome = totalIncome > 0 ? totalIncome : 0.01;
          newMonthlyAmount = (numValue / 100) * effectiveIncome;
          break;
        }
      }

      const roundedMonthly = Number(newMonthlyAmount.toFixed(2));

      if (activeScenarioId) {
        // SCENARIO MODE: Update or Create a Projection instead of changing the real budget
        const existingProj = projections.find(p => p.category === parentCategory.name && p.stream === subCategory.name);

        if (existingProj) {
          await updateProjectionMutation.mutateAsync({
            id: existingProj.id,
            updates: { amount: roundedMonthly }
          });
        } else {
          await addProjectionMutation.mutateAsync({
            category: parentCategory.name,
            stream: subCategory.name,
            amount: roundedMonthly,
            date: new Date(parseInt(selectedYear), 0, 1).toISOString().slice(0, 10),
            recurring: 'Monthly',
            planned: true,
            source: subCategory.name,
            description: `Scenario override for ${subCategory.name}`
          });
        }
        queryClient.invalidateQueries({ queryKey: ['projections'] });
      } else {
        // MASTER MODE: Standard budget update
        if (updateSubCategoryBudgetMutation) {
          await updateSubCategoryBudgetMutation.mutateAsync({
            subCategoryId: subCategory.id || null,
            categoryId: parentCategory.id,
            amount: roundedMonthly,
            targetBudgetId: budget?.id,
            year: parseInt(selectedYear)
          });
          await refreshBudget();
        }
      }
    } catch (e) {
      console.error('Failed to update budget', e);
    } finally {
      setEditingBudget(prev => prev === currentKey ? null : prev);
    }
  };

  // Matching Logic: For each projection in the selected year, find matching actual transactions
  const matchProjectionsToActuals = (projList: any[], actualList: any[]) => {
    return projList.map(p => {
      const pSource = (p.source || p.merchant || '').toLowerCase();
      const projMonth = p.date?.slice(0, 7);

      const matches = actualList.filter(tx => {
        if (tx.projection_id === p.id) return true;
        if (tx.projection_id) return false;

        const txMonth = tx.date?.slice(0, 7);
        if (txMonth !== projMonth) return false;

        // Ensure category and stream (sub_category) match if specified
        if (tx.category !== p.category) return false;
        if (p.stream && tx.sub_category !== p.stream) return false;

        const txSource = (tx.source || tx.merchant || '').toLowerCase();
        const txCleanSource = (tx.clean_source || tx.clean_merchant || '').toLowerCase();

        return (txCleanSource && txCleanSource === pSource) || (txSource && txSource === pSource);
      });
      const actualAmount = matches.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      return {
        ...p,
        actual_amount: actualAmount,
        is_matched: matches.length > 0
      };
    });
  };

  const futureTransactions = useMemo(() =>
    matchProjectionsToActuals(projections, transactions),
    [projections, transactions]
  );

  // Mutations
  const addProjectionMutation = useMutation({
    mutationFn: async (newP: any) => {
      const { data: userData } = await supabase.auth.getUser();
      // Map source -> merchant for DB
      const { source, ...rest } = newP;
      const dbPayload = {
        ...rest,
        merchant: source,
        user_id: userData.user?.id,
        scenario_id: activeScenarioId
      };

      const { error } = await supabase
        .from('projections' as any)
        .insert([dbPayload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({ title: "Success", description: "Projection added successfully" });
    },
    onError: (error) => {
      console.error('Add Projection error:', error);
      toast({ title: "Error", description: "Failed to add projection", variant: "destructive" });
    }
  });

  const deleteProjectionMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const { error } = await supabase.from('projections' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({ title: "Deleted", description: "Projection removed" });
    },
    onError: (error) => {
      console.error('Delete Projection error:', error);
      toast({ title: "Error", description: "Failed to delete projection", variant: "destructive" });
    }
  });

  const updateProjectionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number, updates: any }) => {
      // Map source -> merchant if present in updates
      const dbUpdates = { ...updates };
      if (updates.source) {
        dbUpdates.merchant = updates.source;
        delete dbUpdates.source;
      }

      const { error } = await supabase.from('projections' as any).update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({ title: "Updated", description: "Projection changes saved" });
    },
    onError: (error) => {
      console.error('Update Projection error:', error);
      toast({ title: "Error", description: "Failed to update projection", variant: "destructive" });
    }
  });

  // Derived Data
  const incomeData = budget?.category_groups?.income || [];
  const klintemarkenData = budget?.category_groups?.klintemarken || [];

  const specialCategoryNames = useMemo(() => {
    if (!budget?.category_groups?.special) return ['Slush Fund'];
    return [
      ...budget.category_groups.special.map(c => c.name),
      'Slush Fund' // Always include as fallback
    ];
  }, [budget]);

  const incomeTransactions = useMemo(() =>
    (futureTransactions as any[]).filter(t => t.amount >= 0 && (t.recurring !== 'N/A' || t.date?.startsWith(selectedYear))),
    [futureTransactions, selectedYear]
  );

  const expenseTransactions = useMemo(() =>
    (futureTransactions as any[]).filter(t =>
      t.amount < 0 &&
      !specialCategoryNames.includes(t.category) &&
      (t.recurring !== 'N/A' || t.date?.startsWith(selectedYear))
    ),
    [futureTransactions, selectedYear, specialCategoryNames]
  );

  const slushFundTransactions = useMemo(() =>
    (futureTransactions as any[]).filter(t =>
      t.amount < 0 &&
      specialCategoryNames.includes(t.category) &&
      (t.recurring !== 'N/A' || t.date?.startsWith(selectedYear))
    ),
    [futureTransactions, selectedYear, specialCategoryNames]
  );

  const handleEditTransaction = (tx: FutureTransaction) => {
    setEditingId(tx.id);
    setTransactionType(tx.amount >= 0 ? 'income' : 'expense');
    setNewTransaction({
      date: tx.date,
      source: tx.source,
      amount: Math.abs(tx.amount).toString(),
      category: tx.category,
      stream: tx.stream,
      planned: tx.planned,
      recurring: tx.recurring,
      description: tx.description
    });
    setShowAddForm(true);
  };

  const primaryExpensesByLabel = useMemo(() => {
    if (!budget?.category_groups?.expenditure) return [];

    const labelGroups: Record<string, BudgetSubCategory[]> = {};

    budget.category_groups.expenditure.forEach(cat => {
      cat.sub_categories.forEach(sub => {
        const label = sub.label || 'Unlabeled';
        if (!labelGroups[label]) labelGroups[label] = [];
        labelGroups[label].push({
          ...sub,
          name: `${cat.name} - ${sub.name}`
        });
      });
    });

    return Object.entries(labelGroups).map(([label, subcategories]) => {
      return {
        id: `label-${label}`,
        name: label,
        type: 'expense',
        budget_amount: subcategories.reduce((sum, sub) => sum + (sub.budget_amount || 0), 0),
        spent: subcategories.reduce((sum, sub) => sum + (sub.spent || 0), 0),
        sub_categories: subcategories.sort((a, b) => a.name.localeCompare(b.name))
      } as unknown as BudgetCategory;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [budget]);

  const unlabeledCategories = useMemo(() => {
    if (!budget?.category_groups?.expenditure) return [];
    const unlabeled: string[] = [];
    budget.category_groups.expenditure.forEach(cat => {
      cat.sub_categories.forEach(sub => {
        if (!sub.label || sub.label.toLowerCase() === 'unlabeled') {
          unlabeled.push(`${cat.name} - ${sub.name}`);
        }
      });
    });
    return unlabeled.sort();
  }, [budget]);

  const projectionData = useMemo(() => {
    const calculateData = (txs: any[]) => {
      const data: ProjectionData[] = [];
      const yearNum = parseInt(selectedYear);

      const feederMonthlyTotal = klintemarkenData.reduce((sum, item) => sum + (item.budget_amount || 0), 0);

      const expenseBreakdownBase: Record<string, number> = {};
      const expenseLabelBreakdownBase: Record<string, number> = {};
      budget?.category_groups?.expenditure?.forEach(cat => {
        const catTotal = cat.sub_categories.reduce((s, sub) => s + (sub.budget_amount || 0), 0);
        expenseBreakdownBase[cat.name || 'Unknown'] = catTotal;
        cat.sub_categories.forEach(sub => {
          const label = sub.label || 'Unlabeled';
          expenseLabelBreakdownBase[label] = (expenseLabelBreakdownBase[label] || 0) + (sub.budget_amount || 0);
        });
      });
      const expenseMonthlyTotal = Object.values(expenseBreakdownBase).reduce((a, b) => a + b, 0);

      let runningBalance = 0;
      const today = new Date();
      const isCurrentYear = yearNum === today.getFullYear();
      const startMonth = isCurrentYear ? today.getMonth() : 0;

      for (let i = 0; i < 12; i++) {
        const monthIdx = (startMonth + i) % 12;
        const yearOffset = Math.floor((startMonth + i) / 12);
        const currentYearNum = yearNum + yearOffset;

        const monthDate = new Date(currentYearNum, monthIdx, 1);
        const monthKey = monthDate.toISOString().slice(0, 7);
        let income = 0;
        let slush = 0;
        const incomeBreakdown: Record<string, number> = {};
        const slushBreakdown: Record<string, number> = {};

        // 1. Process Income from Budget Categories (merging with overrides in projections)
        budget?.category_groups?.income?.forEach(cat => {
          cat.sub_categories.forEach(sub => {
            if (disabledIncomeStreams.has(sub.name)) return;

            // Find ALL potential projections for this stream
            const matches = txs.filter(t =>
              (t.stream === sub.name && t.category === cat.name) ||
              (t.source === sub.name && (t.category === 'Income' || t.category === cat.name))
            );

            let amount = sub.budget_amount;

            // Check for overrides in any matching projection
            matches.forEach(m => {
              const monthOverride = m.overrides?.[monthKey];
              if (monthOverride && monthOverride.amount !== undefined) {
                amount = monthOverride.amount;
              } else if (m.recurring === 'Monthly') {
                amount = m.amount;
              } else {
                // If it's a non-monthly recurring projection, it will be handled in the txs loop below?
                // Actually, to avoid double counting, we should mark these projections as "handled"
                // but let's stick to the simplest override logic first.
              }
            });

            income += amount;
            incomeBreakdown[sub.name] = (incomeBreakdown[sub.name] || 0) + amount;
          });
        });

        // 2. Process non-income projections and Slush fund items
        txs.forEach(t => {
          if (!t.date) return;

          const isKnownIncome = budget?.category_groups?.income?.some(cat =>
            cat.sub_categories.some(sub =>
              sub.name === t.stream || sub.name === t.source
            )
          );

          const transDate = new Date(t.date);
          const transMonthKey = t.date.slice(0, 7);
          const monthOverride = t.overrides?.[monthKey];
          const effectiveAmount = monthOverride?.amount ?? t.amount;
          const amountToUse = (t.actual_amount !== undefined && t.actual_amount !== 0 && transMonthKey === monthKey)
            ? t.actual_amount
            : effectiveAmount;

          let isCurrentMonth = false;
          if (t.recurring === 'N/A') {
            if (transMonthKey === monthKey) isCurrentMonth = true;
          } else if (t.recurring === 'Monthly') {
            if (new Date(t.date) <= new Date(yearNum, monthIdx, 28)) isCurrentMonth = true;
          } else if (t.recurring === 'Annually') {
            if (transDate.getMonth() === monthIdx) isCurrentMonth = true;
          } else if (t.recurring === 'Bi-annually') {
            const firstMonth = transDate.getMonth();
            const secondMonth = (firstMonth + 6) % 12;
            if (monthIdx === firstMonth || monthIdx === secondMonth) isCurrentMonth = true;
          } else if (t.recurring === 'Quarterly') {
            const startMonth = transDate.getMonth();
            if ((monthIdx - startMonth) % 3 === 0) isCurrentMonth = true;
          }

          if (isCurrentMonth) {
            if (amountToUse >= 0) {
              // Only add if it wasn't handled by the budget loop above
              // AND ensure it doesn't just match the "Income" category name to avoid doubling
              if (!isKnownIncome) {
                const streamName = t.stream || t.source || 'Other';

                // If it's not a known sub-category (handled in first loop), but it is a positive amount
                // that belongs to an Income category, we strictly exclude it to avoid doubling.
                const isIncomeCategory = budget?.category_groups?.income?.some(cat => cat.name === t.category);
                if (isIncomeCategory && !isKnownIncome) return;

                // Handle generic "Income" or category name as stream name
                const isTopLevelCategoryName = budget?.category_groups?.income?.some(cat => cat.name === streamName);
                if (isTopLevelCategoryName || streamName === 'Income') return;

                income += amountToUse;
                incomeBreakdown[streamName] = (incomeBreakdown[streamName] || 0) + amountToUse;
              }
            } else if (specialCategoryNames.includes(t.category)) {
              // Show individual Slush items as requested
              const itemName = t.source || t.stream || 'Slush Item';
              const uniqueKey = `${itemName} [${t.id?.slice(0, 4) || 'tx'}]`;
              const absVal = Math.abs(amountToUse);
              slush += absVal;
              slushBreakdown[uniqueKey] = (slushBreakdown[uniqueKey] || 0) + absVal;
            }
          }
        });

        const monthlyNet = income + feederMonthlyTotal - expenseMonthlyTotal - slush;
        runningBalance += monthlyNet;

        data.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          value: monthlyNet,
          cumulativeBalance: runningBalance,
          date: monthKey,
          income,
          feeder: feederMonthlyTotal,
          expense: expenseMonthlyTotal,
          slush,
          breakdown: {
            incomeBreakdown,
            feederBreakdown: { 'Feeder Budget': feederMonthlyTotal },
            expenseBreakdown: { ...expenseBreakdownBase },
            expenseLabelBreakdown: { ...expenseLabelBreakdownBase },
            slushBreakdown
          }
        });
      }
      return data;
    };

    return calculateData(futureTransactions);
  }, [futureTransactions, selectedYear, klintemarkenData, specialCategoryNames, budget, disabledIncomeStreams]);

  const stats = useMemo(() => {
    const totalIncome = projectionData.reduce((sum, d) => sum + (d.income || 0), 0);
    const totalFeeder = projectionData.reduce((sum, d) => sum + (d.feeder || 0), 0);
    const totalExpenses = projectionData.reduce((sum, d) => sum + (d.expense || 0), 0);
    const totalSlush = projectionData.reduce((sum, d) => sum + (d.slush || 0), 0);

    return {
      income: totalIncome,
      feeder: totalFeeder,
      expenses: totalExpenses,
      slush: totalSlush,
      totalIncome: (totalIncome + totalFeeder),
      totalExpenses: (totalExpenses + totalSlush),
      pl: (totalIncome + totalFeeder) - (totalExpenses + totalSlush)
    };
  }, [projectionData]);

  const masterProjectionData = useMemo(() => {
    if (!activeScenarioId) return undefined;
    const matchedMaster = matchProjectionsToActuals(masterProjectionsRaw, transactions);

    const calculateData = (txs: any[]) => {
      const data: ProjectionData[] = [];
      const yearNum = parseInt(selectedYear);

      const feederMonthlyTotal = klintemarkenData.reduce((sum, item) => sum + (item.budget_amount || 0), 0);

      const expenseBreakdownBase: Record<string, number> = {};
      const expenseLabelBreakdownBase: Record<string, number> = {};
      budget?.category_groups?.expenditure?.forEach(cat => {
        const catTotal = cat.sub_categories.reduce((s, sub) => s + (sub.budget_amount || 0), 0);
        expenseBreakdownBase[cat.name || 'Unknown'] = catTotal;
        cat.sub_categories.forEach(sub => {
          const label = sub.label || 'Unlabeled';
          expenseLabelBreakdownBase[label] = (expenseLabelBreakdownBase[label] || 0) + (sub.budget_amount || 0);
        });
      });
      const expenseMonthlyTotal = Object.values(expenseBreakdownBase).reduce((a, b) => a + b, 0);

      let runningBalance = 0;
      const today = new Date();
      const isCurrentYear = yearNum === today.getFullYear();
      const startMonth = isCurrentYear ? today.getMonth() : 0;

      for (let i = 0; i < 12; i++) {
        const monthIdx = (startMonth + i) % 12;
        const yearOffset = Math.floor((startMonth + i) / 12);
        const currentYearNum = yearNum + yearOffset;

        const monthDate = new Date(currentYearNum, monthIdx, 1);
        const monthKey = monthDate.toISOString().slice(0, 7);
        let income = 0;
        let slush = 0;
        const incomeBreakdown: Record<string, number> = {};
        const slushBreakdown: Record<string, number> = {};

        // 1. Process Income from Budget Categories (merging with overrides in projections)
        budget?.category_groups?.income?.forEach(cat => {
          cat.sub_categories.forEach(sub => {
            if (disabledIncomeStreams.has(sub.name)) return;

            const matches = txs.filter(t =>
              (t.stream === sub.name && t.category === cat.name) ||
              (t.source === sub.name && (t.category === 'Income' || t.category === cat.name))
            );

            let amount = sub.budget_amount;
            matches.forEach(m => {
              const monthOverride = m.overrides?.[monthKey];
              if (monthOverride && monthOverride.amount !== undefined) {
                amount = monthOverride.amount;
              } else if (m.recurring === 'Monthly') {
                amount = m.amount;
              }
            });

            income += amount;
            incomeBreakdown[sub.name] = (incomeBreakdown[sub.name] || 0) + amount;
          });
        });

        // 2. Process non-income projections and Slush fund items
        txs.forEach(t => {
          if (!t.date) return;

          const isKnownIncome = budget?.category_groups?.income?.some(cat =>
            cat.sub_categories.some(sub =>
              sub.name === t.stream || sub.name === t.source
            )
          );

          const transDate = new Date(t.date);
          const transMonthKey = t.date.slice(0, 7);
          const monthOverride = t.overrides?.[monthKey];
          const effectiveAmount = monthOverride?.amount ?? t.amount;
          const amountToUse = (t.actual_amount !== undefined && t.actual_amount !== 0 && transMonthKey === monthKey)
            ? t.actual_amount
            : effectiveAmount;

          let isCurrentMonth = false;
          if (t.recurring === 'N/A') {
            if (transMonthKey === monthKey) isCurrentMonth = true;
          } else if (t.recurring === 'Monthly') {
            if (new Date(t.date) <= new Date(yearNum, monthIdx, 28)) isCurrentMonth = true;
          } else if (t.recurring === 'Annually') {
            if (transDate.getMonth() === monthIdx) isCurrentMonth = true;
          } else if (t.recurring === 'Bi-annually') {
            const firstMonth = transDate.getMonth();
            const secondMonth = (firstMonth + 6) % 12;
            if (monthIdx === firstMonth || monthIdx === secondMonth) isCurrentMonth = true;
          } else if (t.recurring === 'Quarterly') {
            const startMonth = transDate.getMonth();
            if ((monthIdx - startMonth) % 3 === 0) isCurrentMonth = true;
          }

          if (isCurrentMonth) {
            if (amountToUse >= 0) {
              if (!isKnownIncome) {
                const streamName = t.stream || t.source || 'Other';

                const isIncomeCategory = budget?.category_groups?.income?.some(cat => cat.name === t.category);
                if (isIncomeCategory && !isKnownIncome) return;

                const isTopLevelCategoryName = budget?.category_groups?.income?.some(cat => cat.name === streamName);
                if (isTopLevelCategoryName || streamName === 'Income') return;

                income += amountToUse;
                incomeBreakdown[streamName] = (incomeBreakdown[streamName] || 0) + amountToUse;
              }
            } else if (specialCategoryNames.includes(t.category)) {
              const itemName = t.source || t.stream || 'Slush Item';
              const uniqueKey = `${itemName} [${t.id?.slice(0, 4) || 'tx'}]`;
              const absVal = Math.abs(amountToUse);
              slush += absVal;
              slushBreakdown[uniqueKey] = (slushBreakdown[uniqueKey] || 0) + absVal;
            }
          }
        });

        const monthlyNet = income + feederMonthlyTotal - expenseMonthlyTotal - slush;
        runningBalance += monthlyNet;

        data.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          value: monthlyNet,
          cumulativeBalance: runningBalance,
          date: monthKey,
          income,
          feeder: feederMonthlyTotal,
          expense: expenseMonthlyTotal,
          slush,
          breakdown: {
            incomeBreakdown,
            feederBreakdown: { 'Feeder Budget': feederMonthlyTotal },
            expenseBreakdown: { ...expenseBreakdownBase },
            expenseLabelBreakdown: { ...expenseLabelBreakdownBase },
            slushBreakdown
          }
        });
      }
      return data;
    };

    return calculateData(matchedMaster);
  }, [masterProjectionsRaw, transactions, selectedYear, activeScenarioId, klintemarkenData, specialCategoryNames, budget, disabledIncomeStreams]);

  const handleAddTransaction = () => {
    if (!newTransaction.amount) {
      toast({ title: "Validation Error", description: "Amount is required", variant: "destructive" });
      return;
    }

    if (!newTransaction.source && !newTransaction.stream && !newTransaction.description) {
      toast({ title: "Validation Error", description: "Please provide a source, stream, or description", variant: "destructive" });
      return;
    }

    const payload = {
      ...newTransaction,
      amount: parseFloat(newTransaction.amount) || 0,
      date: newTransaction.date || new Date().toISOString().slice(0, 10)
    };

    if (editingId) {
      updateProjectionMutation.mutate({ id: editingId, updates: payload });
    } else {
      addProjectionMutation.mutate(payload);
    }
    resetForm();
  };

  const resetForm = () => {
    setNewTransaction({
      date: new Date().toISOString().slice(0, 10),
      source: '',
      amount: '',
      category: transactionType === 'income' ? 'Income' : 'Food',
      stream: '',
      planned: true,
      recurring: 'Monthly',
      description: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSlushSubmit = (data: { name: string; date: string; amount: number; category: string }) => {
    if (slushEditingTx) {
      updateProjectionMutation.mutate({
        id: slushEditingTx.id,
        updates: {
          source: data.name,
          description: data.name,
          date: data.date,
          amount: data.amount,
          recurring: 'N/A',
          category: data.category,
          stream: ''
        }
      });
      setSlushEditingTx(null);
    } else {
      addProjectionMutation.mutate({
        source: data.name,
        description: data.name,
        date: data.date,
        amount: data.amount,
        recurring: 'N/A',
        category: data.category,
        stream: '',
        planned: true
      });
    }
  };

  const handleDeleteTransaction = (id: string | number) => deleteProjectionMutation.mutate(id);
  const handleTransactionChange = (updates: Partial<NewTransactionForm>) => setNewTransaction(prev => ({ ...prev, ...updates }));

  const handleAddClick = (type: 'income' | 'expense', category?: string) => {
    setTransactionType(type);
    setNewTransaction({
      date: new Date().toISOString().slice(0, 10),
      source: '',
      amount: '',
      category: category || (type === 'income' ? 'Income' : 'Food'),
      stream: '',
      planned: true,
      recurring: 'Monthly',
      description: ''
    });
    setEditingId(null);
    setShowAddForm(true);
  };

  const handlePasteClick = (type: 'income' | 'expense') => {
    setPasteDialogType(type);
    setShowPasteDialog(true);
  };

  const handlePasteImport = (pastedTransactions: any[]) => {
    pastedTransactions.forEach(t => {
      addProjectionMutation.mutate({
        ...t,
        stream: t.subCategory || '',
        recurring: 'N/A' as RecurringInterval
      });
    });
  };

  const totalBudgetedIncome = Math.max(incomeData.reduce((sum, item) => sum + item.budget_amount, 0), 0.01);

  const deleteScenarioMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scenarios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      setActiveScenarioId(null);
      toast({ title: "Deleted", description: "Scenario removed" });
    },
    onError: (error) => {
      console.error('Delete Scenario error:', error);
      toast({ title: "Error", description: "Failed to delete scenario", variant: "destructive" });
    }
  });

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/budget">Budget</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Projections</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              {activeScenarioId ? `Scenario: ${scenarios.find(s => s.id === activeScenarioId)?.name}` : 'Master Projections'}
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {activeScenarioId ? 'What-if playground • Edits do not affect Master' : 'Production Budget • Feeders & Core Income'}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
              <Switch
                id="past-projections"
                checked={showPastProjections}
                onCheckedChange={setShowPastProjections}
              />
              <Label htmlFor="past-projections" className="text-xs font-bold uppercase tracking-wider text-gray-500 cursor-pointer flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Show Past Projections
              </Label>
            </div>
            <Tabs value={selectedYear} onValueChange={setSelectedYear} className="w-[300px]">
              <TabsList className="grid w-full grid-cols-3">
                {availableYearsList.map(year => (
                  <TabsTrigger key={year} value={year.toString()}>
                    {year}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Scenario Navigation Tabs */}
      <div className="mb-8 flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <Tabs value={activeScenarioId || 'master'} onValueChange={(val) => setActiveScenarioId(val === 'master' ? null : val)} className="flex-1">
          <TabsList className="bg-gray-100/50 p-1 h-12 gap-1 inline-flex w-auto">
            <TabsTrigger
              value="master"
              className="px-6 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold uppercase tracking-wider text-[10px]"
            >
              Master
            </TabsTrigger>
            {scenarios.map(scenario => (
              <TabsTrigger
                key={scenario.id}
                value={scenario.id}
                className="px-6 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold uppercase tracking-wider text-[10px] group flex items-center gap-2"
              >
                {scenario.name}
                {activeScenarioId === scenario.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-4 h-4 text-rose-400 hover:text-rose-600 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this scenario? All its data will be lost.')) {
                        deleteScenarioMutation.mutate(scenario.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          onClick={() => setShowCreateScenario(true)}
          className="bg-primary hover:bg-primary/90 text-white gap-2 font-bold uppercase tracking-tighter h-10 px-4 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          New Scenario
        </Button>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-emerald-100 bg-white shadow-sm overflow-hidden relative group transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <TrendingUp className="w-16 h-16 text-emerald-600" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600/80">Projected Income</p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-3xl font-black text-emerald-950 flex items-baseline gap-2">
                <span className="text-sm font-bold text-emerald-600/40">DKK</span>
                {stats.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h2>
              <div className="flex flex-col gap-1 mt-4 pt-4 border-t border-emerald-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-emerald-600/50 uppercase tracking-tighter">Income Projections</span>
                  <span className="text-xs font-bold text-emerald-700">DKK {stats.income.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-emerald-600/50 uppercase tracking-tighter">Feeder Budgets</span>
                  <span className="text-xs font-bold text-emerald-700">DKK {stats.feeder.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-white shadow-sm overflow-hidden relative group transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <TrendingDown className="w-16 h-16 text-rose-600" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 rounded-lg">
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-rose-600/80">Primary Expenses</p>
              </div>
              <Link to="/budget" className="text-[10px] text-primary/60 hover:text-primary transition-colors uppercase tracking-tighter font-black hover:underline">
                Budget Tab ↗
              </Link>
            </div>
            <div className="flex flex-col">
              <h2 className="text-3xl font-black text-rose-950 flex items-baseline gap-2">
                <span className="text-sm font-bold text-rose-600/40">DKK</span>
                {stats.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h2>
              <div className="flex flex-col gap-1 mt-4 pt-4 border-t border-rose-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-rose-600/50 uppercase tracking-tighter">Budgeted Baseline</span>
                  <span className="text-xs font-bold text-rose-700">DKK {stats.expenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-rose-600/50 uppercase tracking-tighter">Projected Slush</span>
                  <span className="text-xs font-bold text-rose-700">DKK {stats.slush.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-purple-100 bg-white shadow-sm overflow-hidden relative group transition-all hover:shadow-md`}>
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Scale className="w-16 h-16 text-purple-600" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-purple-50 rounded-lg">
                <Wallet className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-purple-600/80">Net Profit / Loss</p>
            </div>
            <div className="flex flex-col">
              <h2 className={`text-3xl font-black flex items-baseline gap-2 ${stats.pl >= 0 ? 'text-purple-950' : 'text-rose-950'}`}>
                <span className="text-sm font-bold opacity-40">DKK</span>
                {stats.pl.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h2>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-purple-50/50">
                <span className="text-[10px] font-black text-purple-600/50 uppercase tracking-tighter">Annual Forecast</span>
                <span className={`text-sm font-bold ${stats.pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stats.pl >= 0 ? '+ On Track' : '- Over Budget'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Financial Forecast
        </h2>
      </div>

      <ProjectionChart
        data={projectionData}
        comparisonData={masterProjectionData}
        title={activeScenarioId ? `Simulation: ${scenarios.find(s => s.id === activeScenarioId)?.name} vs Master` : `Projection for ${selectedYear}`}
        activeLabel={activeScenarioId ? "Scenario" : "Projected"}
        comparisonLabel="Master"
        unlabeledCategories={unlabeledCategories}
      />

      <div className="space-y-6">
        {/* Slush Fund Section */}
        <div key="slush-fund" className="animate-in fade-in duration-500 delay-200">
          <SlushFundTransactionsTable
            transactions={slushFundTransactions}
            onDelete={handleDeleteTransaction}
            onUpdate={(id, updates) => updateProjectionMutation.mutate({ id, updates })}
            onEdit={(tx) => { setSlushEditingTx(tx as FutureTransaction); setSlushDialogOpen(true); }}
            onAddClick={() => { setSlushEditingTx(null); setSlushDialogOpen(true); }}
            selectedYear={selectedYear}
            showPastProjections={showPastProjections}
          />
        </div>

        {/* Income Sources Card */}
        {incomeData.length > 0 && (
          <Card key="income" className="shadow-sm border-emerald-100 bg-emerald-50/10 overflow-hidden rounded-3xl animate-in fade-in duration-500">
            <div className="bg-emerald-50/50 border-b border-emerald-100 py-4 px-6 flex justify-between items-center">
              <CardTitle className="text-xl text-emerald-800 flex items-center gap-2 font-bold shrink-0">Projected Income</CardTitle>
              <div className="flex items-center gap-6 ml-auto pr-4">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-black text-emerald-600/60 leading-tight tracking-widest">Projected Monthly</p>
                  <p className="text-lg font-black text-emerald-900 leading-tight font-mono">{formatCurrency(projectionData[0]?.income || 0, settings.currency)}</p>
                </div>
                <div className="text-right border-l border-emerald-100 pl-6">
                  <p className="text-[10px] uppercase font-black text-emerald-600/60 leading-tight tracking-widest">Projected Annual</p>
                  <p className="text-lg font-black text-emerald-900 leading-tight font-mono">{formatCurrency(projectionData.reduce((sum, d) => sum + (d.income || 0), 0), settings.currency)}</p>
                </div>
              </div>
            </div>
            <CardContent className="p-0">
              <ProjectedIncomeTable
                incomeCategories={incomeData as any}
                projections={futureTransactions}
                disabledStreams={disabledIncomeStreams}
                onToggleStream={(name) => {
                  const next = new Set(disabledIncomeStreams);
                  if (next.has(name)) next.delete(name);
                  else next.add(name);
                  setDisabledIncomeStreams(next);
                }}
                onUpdateValue={async (stream, category, monthKey, amount, mode) => {
                  // Find existing projection for this stream
                  const existing = futureTransactions.find(p => p.stream === stream && p.category === category);
                  if (mode === 'single') {
                    if (existing) {
                      const newOverrides = { ...(existing.overrides || {}) };
                      newOverrides[monthKey] = { amount };
                      await updateProjectionMutation.mutateAsync({ id: existing.id, updates: { overrides: newOverrides } });
                    } else {
                      // Create new projection for this stream
                      await addProjectionMutation.mutateAsync({
                        category,
                        stream,
                        amount: amount, // For single month, we set it as the base and use override logic?
                        // Actually, if it's the first time, maybe just set it as single month projection
                        date: `${monthKey}-01`,
                        recurring: 'N/A',
                        planned: true,
                        source: stream,
                        description: `Income override for ${stream}`
                      });
                    }
                  } else {
                    // Forward mode: set the base amount and clear subsequent overrides?
                    // Or set recurring to Monthly and change amount
                    if (existing) {
                      await updateProjectionMutation.mutateAsync({
                        id: existing.id,
                        updates: {
                          amount,
                          recurring: 'Monthly',
                          date: `${monthKey}-01`,
                          overrides: {} // Clear overrides to let the new base take effect
                        }
                      });
                    } else {
                      await addProjectionMutation.mutateAsync({
                        category,
                        stream,
                        amount,
                        date: `${monthKey}-01`,
                        recurring: 'Monthly',
                        planned: true,
                        source: stream,
                        description: `Income override for ${stream}`
                      });
                    }
                  }
                  queryClient.invalidateQueries({ queryKey: ['projections'] });
                }}
                currency={settings.currency}
              />
            </CardContent>
          </Card>
        )}

        {/* Feeder Budgets */}
        {klintemarkenData.length > 0 && (
          <Card key="klintemarken" className="shadow-sm border-blue-100 bg-blue-50/10 overflow-hidden rounded-3xl animate-in fade-in duration-500 delay-100">
            <div className="bg-blue-50/50 border-b border-blue-100 py-4 px-6 flex justify-between items-center">
              <CardTitle className="text-xl text-blue-800 flex items-center gap-2 font-bold">Projected Feeder</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => expandAll(klintemarkenData.map(d => d.name))} className="h-8 text-[10px] uppercase tracking-wider font-bold">Expand All</Button>
                <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-[10px] uppercase tracking-wider font-bold">Collapse All</Button>
              </div>
            </div>
            <CardContent className="p-0">
              <BudgetTable
                data={klintemarkenData as any}
                type="klintemarken"
                hideHeader={true}
                expandedCategories={expandedCategories}
                toggleCategory={toggleCategory}
                editingBudget={editingBudget}
                setEditingBudget={setEditingBudget}
                handleUpdateBudget={handleUpdateBudget}
                totalIncome={totalBudgetedIncome}
                currency={settings.currency}
                selectedYear={parseInt(selectedYear)}
              />
            </CardContent>
          </Card>
        )}

        {/* Primary Expenses Section (Read Only Reference) */}
        {budget?.category_groups?.expenditure && (
          <Card key="expenses-top" className="shadow-sm border-gray-100 bg-gray-50/30 overflow-hidden rounded-3xl animate-in fade-in duration-500 delay-150">
            <div className="bg-gray-50/50 border-b border-gray-100 py-4 px-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl text-gray-800 flex items-center gap-2 font-bold">Baseline: Primary Expenses</CardTitle>
                <div className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-black uppercase rounded tracking-wider">Read Only</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => expandAll(primaryExpensesByLabel.map(d => d.name))} className="h-8 text-[10px] uppercase tracking-wider font-bold">Expand All</Button>
                <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-[10px] uppercase tracking-wider font-bold">Collapse All</Button>
              </div>
            </div>
            <CardContent className="p-0">
              <BudgetTable
                data={primaryExpensesByLabel as any}
                type="expense"
                hideHeader={true}
                expandedCategories={expandedCategories}
                toggleCategory={toggleCategory}
                editingBudget={null}
                setEditingBudget={() => { }}
                handleUpdateBudget={async () => { }}
                totalIncome={totalBudgetedIncome}
                currency={settings.currency}
                selectedYear={parseInt(selectedYear)}
              />
            </CardContent>
          </Card>
        )}

      </div>

      <AddTransactionFormV2
        showForm={showAddForm}
        transactionType={transactionType}
        newTransaction={newTransaction}
        onTransactionChange={handleTransactionChange}
        onSubmit={handleAddTransaction}
        onCancel={resetForm}
        onPasteClick={() => handlePasteClick(transactionType)}
        isEditing={!!editingId}
      />

      {/* Legacy Section */}
      <div className="mt-12 pt-8 border-t border-gray-100">
        <button
          onClick={() => setShowLegacy(!showLegacy)}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors mb-4 group"
        >
          {showLegacy ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="text-sm font-medium uppercase tracking-widest">Legacy Projections (Experimental)</span>
        </button>

        {showLegacy && (
          <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 max-w-2xl">
                These are automated projections based on historical data. This feature is currently in preview and may not reflect manual budget adjustments.
              </p>
              <Button
                variant="outline"
                onClick={() => setShowWizard(true)}
                className="gap-2 text-primary border-primary hover:bg-primary/10"
              >
                <Sparkles className="w-4 h-4" />
                Suggest Projections
              </Button>
            </div>


            {showLegacy && (
              <div className="space-y-6">
                <IncomeTransactionsTable
                  transactions={incomeTransactions}
                  onDelete={handleDeleteTransaction}
                  onEdit={handleEditTransaction}
                  onUpdate={(id, updates) => updateProjectionMutation.mutate({ id, updates })}
                  onAddClick={() => handleAddClick('income')}
                  selectedYear={selectedYear}
                  showPastProjections={showPastProjections}
                />

                <ExpenseTransactionsTable
                  transactions={expenseTransactions}
                  onDelete={handleDeleteTransaction}
                  onEdit={handleEditTransaction}
                  onUpdate={(id, updates) => updateProjectionMutation.mutate({ id, updates })}
                  onAddClick={() => handleAddClick('expense')}
                  selectedYear={selectedYear}
                  showPastProjections={showPastProjections}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <PasteDataDialog
        open={showPasteDialog}
        onClose={() => setShowPasteDialog(false)}
        onImport={handlePasteImport}
        transactionType={pasteDialogType}
      />

      <SuggestProjectionsWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onAddProjections={(projectionsToAdd) => {
          projectionsToAdd.forEach(p => addProjectionMutation.mutate(p));
          setShowWizard(false);
        }}
      />

      <CreateScenarioDialog
        open={showCreateScenario}
        onOpenChange={setShowCreateScenario}
        onSuccess={(id) => setActiveScenarioId(id)}
      />
      <SlushFundAddDialog
        open={slushDialogOpen}
        onOpenChange={(open) => { setSlushDialogOpen(open); if (!open) setSlushEditingTx(null); }}
        onSubmit={handleSlushSubmit}
        editingTransaction={slushEditingTx}
      />
    </div >
  );
};

export default Projection;
