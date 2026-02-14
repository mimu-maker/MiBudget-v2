import React, { createContext, useContext, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';

export type Period =
    | 'All'
    | 'This month'
    | 'Last Month'
    | 'This Quarter'
    | 'Last Quarter'
    | 'This Year'
    | 'Last Year'
    | 'Year to Date'
    | 'Custom'
    | string;

interface PeriodContextType {
    selectedPeriod: Period;
    setSelectedPeriod: (period: Period) => void;
    customDateRange: DateRange | undefined;
    setCustomDateRange: (range: DateRange | undefined) => void;
    includeSpecial: boolean;
    setIncludeSpecial: (include: boolean) => void;
    includeKlintemarken: boolean;
    setIncludeKlintemarken: (include: boolean) => void;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

const STORAGE_KEY = 'mibudget_selected_period_v2';
const SPECIAL_KEY = 'mibudget_include_special';
const KLINTEMARKEN_KEY = 'mibudget_include_klintemarken';

export const PeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedPeriod, setSelectedPeriodState] = useState<Period>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return (saved as Period) || 'All'; // Show all transactions by default
    });
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

    const [includeSpecial, setIncludeSpecialState] = useState<boolean>(() => {
        const saved = localStorage.getItem(SPECIAL_KEY);
        return saved === null ? true : saved === 'true';
    });

    const [includeKlintemarken, setIncludeKlintemarkenState] = useState<boolean>(() => {
        const saved = localStorage.getItem(KLINTEMARKEN_KEY);
        return saved === null ? true : saved === 'true';
    });

    const setSelectedPeriod = (period: Period) => {
        setSelectedPeriodState(period);
        localStorage.setItem(STORAGE_KEY, period);
    };

    const setIncludeSpecial = (include: boolean) => {
        setIncludeSpecialState(include);
        localStorage.setItem(SPECIAL_KEY, String(include));
    };

    const setIncludeKlintemarken = (include: boolean) => {
        setIncludeKlintemarkenState(include);
        localStorage.setItem(KLINTEMARKEN_KEY, String(include));
    };

    return (
        <PeriodContext.Provider value={{
            selectedPeriod,
            setSelectedPeriod,
            customDateRange,
            setCustomDateRange,
            includeSpecial,
            setIncludeSpecial,
            includeKlintemarken,
            setIncludeKlintemarken
        }}>
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
