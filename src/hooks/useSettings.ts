import { useState, useEffect } from 'react';

export interface AppSettings {
    sidAmount: number;
    specialAmount: string | number;
    categories: string[];
    accounts: string[];
    statuses: string[];
    budgetTypes: string[];
    recurringOptions: string[];
    updatedAt: string;
}

const DEFAULT_SETTINGS: AppSettings = {
    sidAmount: 5000,
    specialAmount: '15%',
    categories: ['Income', 'Housing', 'Food', 'Transport', 'Entertainment', 'Healthcare', 'Utilities'],
    accounts: ['Master', 'Joint', 'Savings', 'Investment'],
    statuses: ['Complete', 'Pending', 'Pending Marcus', 'Pending Sarah'],
    budgetTypes: ['Budgeted', 'Special', 'Klintemarken', 'Exclude'],
    recurringOptions: ['No', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
    updatedAt: new Date().toISOString()
};

const STORAGE_KEY = 'financeSettings';

export const useSettings = () => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure all fields exist (in case of migrations)
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

    return {
        settings,
        loading,
        saveSettings,
        addItem,
        removeItem
    };
};
