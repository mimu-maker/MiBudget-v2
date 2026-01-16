
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Period =
    | 'This month'
    | 'Last Month'
    | 'This Quarter'
    | 'Last Quarter'
    | 'This Year'
    | 'Last Year'
    | '2024'
    | '2023';

interface PeriodContextType {
    selectedPeriod: Period;
    setSelectedPeriod: (period: Period) => void;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

const STORAGE_KEY = 'mibudget_selected_period';

export const PeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedPeriod, setSelectedPeriodState] = useState<Period>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return (saved as Period) || 'This Year';
    });

    const setSelectedPeriod = (period: Period) => {
        setSelectedPeriodState(period);
        localStorage.setItem(STORAGE_KEY, period);
    };

    return (
        <PeriodContext.Provider value={{ selectedPeriod, setSelectedPeriod }}>
            {children}
        </PeriodContext.Provider>
    );
};

export const usePeriod = () => {
    const context = useContext(PeriodContext);
    if (context === undefined) {
        throw new Error('usePeriod must be used within a PeriodProvider');
    }
    return context;
};
