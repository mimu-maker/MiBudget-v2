
import { useState, useEffect } from 'react';

export interface CategoryConfig {
    description?: string;
}

export interface AppSettings {
    categories: string[];
    subCategories: Record<string, string[]>; // category -> [sub1, sub2]
    categoryConfigs: Record<string, CategoryConfig>; // category -> config
    accounts: string[];
    budgetTypes: string[];
    categoryBudgets: Record<string, number | string>; // Allow number or "50%"
    subCategoryBudgets: Record<string, Record<string, number | string>>; // cat -> sub -> budget
    balancingSubCategory?: { category: string, subCategory: string };
    currency: string;
    darkMode: boolean;
    updatedAt: string;
}

const DEFAULT_SETTINGS: AppSettings = {
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
    subCategoryBudgets: {},
    balancingSubCategory: { category: 'Savings', subCategory: 'Investments' },
    accounts: ['Master', 'Joint', 'Savings', 'Investment'],
    budgetTypes: ['Budgeted', 'Special', 'Klintemarken', 'Exclude'],
    currency: 'DKK',
    darkMode: false,
    updatedAt: new Date().toISOString()
};

export const APP_STATUSES = ['Pending Triage', 'Pending Person/Event', 'Reconciled', 'Complete'];

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

    const updateCategoryBudget = (category: string, amount: number | string) => {
        saveSettings({
            categoryBudgets: {
                ...settings.categoryBudgets,
                [category]: amount
            }
        });
    };

    const updateSubCategoryBudget = (category: string, subCategory: string, amount: number | string) => {
        saveSettings({
            subCategoryBudgets: {
                ...settings.subCategoryBudgets,
                [category]: {
                    ...(settings.subCategoryBudgets[category] || {}),
                    [subCategory]: amount
                }
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

    // Reorder items in a list (for categories/subcategories reordering)
    const reorderItems = (field: 'categories' | 'subCategories', items: string[] | Record<string, string[]>, category?: string) => {
        if (field === 'categories' && Array.isArray(items)) {
            saveSettings({ categories: items });
        } else if (field === 'subCategories' && category && Array.isArray(items)) {
            // For subcategories, input items should be the new array for that category
            saveSettings({
                subCategories: {
                    ...settings.subCategories,
                    [category]: items as unknown as string[]
                }
            });
        }
    };

    const moveSubCategory = (subCategory: string, fromCategory: string, toCategory: string, newSubCategoryName?: string) => {
        const finalSubName = newSubCategoryName || subCategory;
        if (fromCategory === toCategory && subCategory === finalSubName) return;

        const oldCatSubs = (settings.subCategories[fromCategory] || []).filter(s => s !== subCategory);
        const newCatSubs = [...(settings.subCategories[toCategory] || [])];
        if (!newCatSubs.includes(finalSubName)) {
            newCatSubs.push(finalSubName);
        }

        const newSubCategoryBudgets = { ...settings.subCategoryBudgets };
        const subBudget = newSubCategoryBudgets[fromCategory]?.[subCategory];

        if (subBudget !== undefined) {
            // Remove from old
            const { [subCategory]: _, ...remainingOldSpecs } = newSubCategoryBudgets[fromCategory] || {};
            newSubCategoryBudgets[fromCategory] = remainingOldSpecs;

            // Add to new (potentially with new name)
            newSubCategoryBudgets[toCategory] = {
                ...(newSubCategoryBudgets[toCategory] || {}),
                [finalSubName]: subBudget
            };
        }

        saveSettings({
            subCategories: {
                ...settings.subCategories,
                [fromCategory]: oldCatSubs,
                [toCategory]: newCatSubs
            },
            subCategoryBudgets: newSubCategoryBudgets
        });
    };

    const renameSubCategory = (category: string, oldName: string, newName: string) => {
        if (oldName === newName) return;

        const currentSubs = settings.subCategories[category] || [];
        const newSubs = currentSubs.map(s => s === oldName ? newName : s);

        const newSubCategoryBudgets = { ...settings.subCategoryBudgets };
        if (newSubCategoryBudgets[category]?.[oldName] !== undefined) {
            const budget = newSubCategoryBudgets[category][oldName];
            delete newSubCategoryBudgets[category][oldName];
            newSubCategoryBudgets[category][newName] = budget;
        }

        saveSettings({
            subCategories: {
                ...settings.subCategories,
                [category]: newSubs
            },
            subCategoryBudgets: newSubCategoryBudgets
        });
    };

    return {
        settings,
        loading,
        saveSettings,
        addItem,
        removeItem,
        updateCategoryBudget,
        updateSubCategoryBudget,
        addSubCategory,
        removeSubCategory,
        updateCategoryConfig,
        reorderItems,
        moveSubCategory,
        renameSubCategory
    };
};
