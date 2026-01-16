
import { useState, useEffect } from 'react';

export interface CategoryConfig {
    overflowCategory?: string;
    description?: string;
}

export interface AppSettings {
    sidAmount: number;
    specialAmount: string | number;
    categories: string[];
    subCategories: Record<string, string[]>; // category -> [sub1, sub2]
    categoryConfigs: Record<string, CategoryConfig>; // category -> config
    accounts: string[];
    statuses: string[];
    budgetTypes: string[];
    recurringOptions: string[];
    categoryBudgets: Record<string, number>;
    dateFormat: 'dd-mm-yyyy' | 'mm-dd-yyyy' | 'yyyy-mm-dd';
    amountFormat: 'us' | 'eu';
    currency: string;
    updatedAt: string;
}

const DEFAULT_SETTINGS: AppSettings = {
    sidAmount: 5000,
    specialAmount: '15%',
    categories: ['Income', 'Housing', 'Food', 'Transport', 'Entertainment', 'Healthcare', 'Utilities', 'Savings'],
    subCategories: {
        'Income': ['Salary', 'Bonus', 'Interest'],
        'Housing': ['Rent/Mortgage', 'Maintenance', 'Utilities'],
        'Food': ['Groceries', 'Dining Out'],
        'Transport': ['Fuel', 'Public Transport', 'Maintenance', 'Insurance'],
        'Entertainment': ['Streaming', 'Events', 'Hobbies'],
        'Healthcare': ['Doctor', 'Medicine', 'Insurance'],
        'Utilities': ['Internet', 'Phone', 'Electricity'],
        'Savings': ['Emergency Fund', 'Investments']
    },
    categoryConfigs: {},
    categoryBudgets: {
        'Housing': 15000,
        'Food': 4000,
        'Transport': 3000,
        'Entertainment': 2500,
        'Utilities': 2000,
        'Healthcare': 1500,
        'Other': 1000
    },
    accounts: ['Master', 'Joint', 'Savings', 'Investment'],
    statuses: ['Complete', 'Pending', 'Pending Marcus', 'Pending Sarah'],
    budgetTypes: ['Budgeted', 'Special', 'Klintemarken', 'Exclude'],
    recurringOptions: ['No', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
    dateFormat: 'dd-mm-yyyy',
    amountFormat: 'eu',
    currency: 'DKK',
    updatedAt: new Date().toISOString()
};

const STORAGE_KEY = 'financeSettings';

export const useSettings = () => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure new fields match
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
        setLoading(false);
    }, []);

    const saveSettings = (newSettings: Partial<AppSettings>) => {
        const updated = { ...settings, ...newSettings, updatedAt: new Date().toISOString() };
        setSettings(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const addItem = (field: keyof AppSettings, item: string) => {
        if (Array.isArray(settings[field]) && !settings[field].includes(item as never)) {
            const newList = [...(settings[field] as string[]), item];
            saveSettings({ [field]: newList });
        }
    };

    const removeItem = (field: keyof AppSettings, item: string) => {
        if (Array.isArray(settings[field])) {
            const newList = (settings[field] as string[]).filter(i => i !== item);
            saveSettings({ [field]: newList });
        }
    };

    const updateCategoryBudget = (category: string, amount: number) => {
        saveSettings({
            categoryBudgets: {
                ...settings.categoryBudgets,
                [category]: amount
            }
        });
    };

    const addSubCategory = (category: string, subCategory: string) => {
        const currentSubs = settings.subCategories[category] || [];
        if (!currentSubs.includes(subCategory)) {
            saveSettings({
                subCategories: {
                    ...settings.subCategories,
                    [category]: [...currentSubs, subCategory]
                }
            });
        }
    };

    const removeSubCategory = (category: string, subCategory: string) => {
        const currentSubs = settings.subCategories[category] || [];
        saveSettings({
            subCategories: {
                ...settings.subCategories,
                [category]: currentSubs.filter(s => s !== subCategory)
            }
        });
    };

    const updateCategoryConfig = (category: string, config: CategoryConfig) => {
        saveSettings({
            categoryConfigs: {
                ...settings.categoryConfigs,
                [category]: {
                    ...(settings.categoryConfigs[category] || {}),
                    ...config
                }
            }
        });
    };

    return {
        settings,
        loading,
        saveSettings,
        addItem,
        removeItem,
        updateCategoryBudget,
        addSubCategory,
        removeSubCategory,
        updateCategoryConfig
    };
};
