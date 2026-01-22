import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types for onboarding data structures
export interface UserPreferences {
  fullName: string;
  accountName: string;
  currency: string;
  dateFormat: string;
  numberFormat: string;
  timezone: string;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
  dataType: 'text' | 'date' | 'number' | 'boolean';
  sampleData: string;
  isNewField?: boolean;
  newFieldValue?: string;
}

export interface IncomeStream {
  id?: string;
  name: string;
  merchantPattern?: string;
  expectedAmount?: number;
  frequency: 'monthly' | 'bi-weekly' | 'weekly' | 'yearly' | 'quarterly';
  isActive: boolean;
  transactions?: any[];
}

export interface Category {
  id?: string;
  name: string;
  icon?: string;
  color?: string;
  isSystem: boolean;
  subCategories?: SubCategory[];
}

export interface SubCategory {
  id?: string;
  name: string;
  categoryId?: string;
}

export interface Budget {
  id?: string;
  name: string;
  budgetType: 'primary' | 'special' | 'custom';
  periodType: 'monthly' | 'weekly' | 'yearly' | 'quarterly';
  startDate: string;
  isActive: boolean;
  accounts?: BudgetAccount[];
  categoryLimits?: BudgetCategoryLimit[];
}

export interface BudgetAccount {
  id?: string;
  accountName: string;
  accountType: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  openingBalance: number;
}

export interface BudgetCategoryLimit {
  id?: string;
  categoryId: string;
  limitAmount: number;
  alertThreshold: number;
}

export interface ImportData {
  fileName: string;
  totalRows: number;
  validRows: number;
  columns: string[];
  sampleData: any[];
  mappedData?: any[];
}

export interface OnboardingState {
  currentPhase: number;
  completedPhases: number[];
  userPreferences: UserPreferences;
  importData: ImportData | null;
  columnMappings: ColumnMapping[];
  incomeStreams: IncomeStream[];
  categories: Category[];
  budgets: Budget[];
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface OnboardingContextType extends OnboardingState {
  // Navigation
  nextPhase: () => void;
  previousPhase: () => void;
  goToPhase: (phase: number) => void;
  
  // Phase-specific actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setImportData: (data: ImportData) => void;
  updateColumnMapping: (mapping: ColumnMapping) => void;
  addIncomeStream: (stream: IncomeStream) => void;
  updateIncomeStream: (id: string, updates: Partial<IncomeStream>) => void;
  removeIncomeStream: (id: string) => void;
  addCategory: (category: Category) => void;
  updateBudget: (budget: Budget) => void;
  
  // Progress management
  saveProgress: () => Promise<void>;
  loadProgress: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  abortOnboarding: () => void;
  
  // Validation
  validateCurrentPhase: () => boolean;
  getPhaseProgress: () => number;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
  userProfile: any; // From AuthContext
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ 
  children, 
  userProfile 
}) => {
  const [state, setState] = useState<OnboardingState>({
    currentPhase: 1,
    completedPhases: [],
    userPreferences: {
      fullName: userProfile?.full_name || '',
      accountName: 'My Budget',
      currency: userProfile?.currency || 'USD',
      dateFormat: userProfile?.date_format || 'MM/DD/YYYY',
      numberFormat: userProfile?.number_format || '1,234.56',
      timezone: userProfile?.timezone || 'UTC'
    },
    importData: null,
    columnMappings: [],
    incomeStreams: [],
    categories: [],
    budgets: [],
    isComplete: userProfile?.is_setup_complete || false,
    isLoading: false,
    error: null
  });

  // Navigation functions
  const nextPhase = useCallback(() => {
    if (state.currentPhase < 7) {
      setState(prev => ({
        ...prev,
        currentPhase: prev.currentPhase + 1,
        completedPhases: [...prev.completedPhases, prev.currentPhase]
      }));
    }
  }, [state.currentPhase]);

  const previousPhase = useCallback(() => {
    if (state.currentPhase > 1) {
      setState(prev => ({
        ...prev,
        currentPhase: prev.currentPhase - 1
      }));
    }
  }, []);

  const goToPhase = useCallback((phase: number) => {
    if (phase >= 1 && phase <= 7) {
      setState(prev => ({
        ...prev,
        currentPhase: phase
      }));
    }
  }, []);

  // Phase-specific actions
  const updatePreferences = useCallback((preferences: Partial<UserPreferences>) => {
    setState(prev => ({
      ...prev,
      userPreferences: { ...prev.userPreferences, ...preferences }
    }));
  }, []);

  const setImportData = useCallback((data: ImportData) => {
    setState(prev => ({
      ...prev,
      importData: data
    }));
  }, []);

  const updateColumnMapping = useCallback((mapping: ColumnMapping) => {
    setState(prev => ({
      ...prev,
      columnMappings: prev.columnMappings.map(m => 
        m.sourceColumn === mapping.sourceColumn ? mapping : m
      )
    }));
  }, []);

  const addIncomeStream = useCallback((stream: IncomeStream) => {
    setState(prev => ({
      ...prev,
      incomeStreams: [...prev.incomeStreams, stream]
    }));
  }, []);

  const updateIncomeStream = useCallback((id: string, updates: Partial<IncomeStream>) => {
    setState(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.map(stream => 
        stream.id === id ? { ...stream, ...updates } : stream
      )
    }));
  }, []);

  const removeIncomeStream = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.filter(stream => stream.id !== id)
    }));
  }, []);

  const addCategory = useCallback((category: Category) => {
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, category]
    }));
  }, []);

  const updateBudget = useCallback((budget: Budget) => {
    setState(prev => ({
      ...prev,
      budgets: prev.budgets.map(b => 
        b.id === budget.id ? budget : b
      )
    }));
  }, []);

  // Progress management
  const saveProgress = useCallback(async () => {
    if (!userProfile?.id) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { error } = await (supabase as any)
        .from('onboarding_progress')
        .upsert({
          user_id: userProfile.id,
          current_phase: state.currentPhase,
          completed_phases: state.completedPhases,
          preferences: state.userPreferences,
          import_summary: state.importData ? {
            fileName: state.importData.fileName,
            totalRows: state.importData.totalRows,
            columns: state.importData.columns
          } : {}
        });

      if (error) throw error;

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to save progress'
      }));
    }
  }, [userProfile?.id, state]);

  const loadProgress = useCallback(async () => {
    if (!userProfile?.id || userProfile.is_setup_complete) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await (supabase as any)
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userProfile.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      if (data) {
        setState(prev => ({
          ...prev,
          currentPhase: data.current_phase,
          completedPhases: data.completed_phases || [],
          userPreferences: { ...prev.userPreferences, ...data.preferences }
        }));
      }

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load progress'
      }));
    }
  }, [userProfile]);

  const completeOnboarding = useCallback(async () => {
    if (!userProfile?.id) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Update user profile to mark setup as complete
      const { error: profileError } = await (supabase as any)
        .from('user_profiles')
        .update({ 
          is_setup_complete: true,
          onboarding_step: 7,
          date_format: state.userPreferences.dateFormat,
          number_format: state.userPreferences.numberFormat
        })
        .eq('user_id', userProfile.id);

      if (profileError) throw profileError;

      // Update onboarding progress
      const { error: progressError } = await (supabase as any)
        .from('onboarding_progress')
        .upsert({
          user_id: userProfile.id,
          current_phase: 7,
          completed_phases: [1, 2, 3, 4, 5, 6, 7],
          preferences: state.userPreferences
        });

      if (progressError) throw progressError;

      setState(prev => ({
        ...prev,
        isComplete: true,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to complete onboarding'
      }));
    }
  }, [userProfile?.id, state.userPreferences]);

  const abortOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPhase: 2, // Return to import choice
      completedPhases: prev.completedPhases.filter(p => p < 2),
      importData: null,
      columnMappings: []
    }));
  }, []);

  // Validation
  const validateCurrentPhase = useCallback((): boolean => {
    switch (state.currentPhase) {
      case 1:
        return !!state.userPreferences.fullName && !!state.userPreferences.accountName;
      case 2:
        return true; // Import choice is always valid
      case 3:
        if (!state.importData) return false;
        // Check if mandatory columns are mapped
        const mandatoryColumns = ['merchant', 'date', 'amount'];
        return mandatoryColumns.every(col => 
          state.columnMappings.some(m => m.targetField === col)
        );
      case 4:
        return true; // Post-import config is optional
      case 5:
        return true; // Income streams are optional
      case 6:
        return state.budgets.length >= 2; // At least Primary and Special
      case 7:
        return true; // Review phase is always valid
      default:
        return false;
    }
  }, [state]);

  const getPhaseProgress = useCallback((): number => {
    return (state.completedPhases.length / 7) * 100;
  }, [state.completedPhases]);

  // Load progress on mount
  useEffect(() => {
    if (userProfile && !userProfile.is_setup_complete) {
      loadProgress();
    }
  }, [userProfile, loadProgress]);

  // Auto-save progress
  useEffect(() => {
    if (!state.isComplete && userProfile && !userProfile.is_setup_complete) {
      const timer = setTimeout(() => {
        saveProgress();
      }, 2000); // Save 2 seconds after any change

      return () => clearTimeout(timer);
    }
  }, [state, userProfile, saveProgress]);

  const value: OnboardingContextType = {
    ...state,
    nextPhase,
    previousPhase,
    goToPhase,
    updatePreferences,
    setImportData,
    updateColumnMapping,
    addIncomeStream,
    updateIncomeStream,
    removeIncomeStream,
    addCategory,
    updateBudget,
    saveProgress,
    loadProgress,
    completeOnboarding,
    abortOnboarding,
    validateCurrentPhase,
    getPhaseProgress
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
