import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';

interface BudgetYearNavigationProps {
    selectedYear: number;
    minYear: number;
    maxYear: number;
    availableYears: number[];
    onYearChange: (year: number) => void;
    navigateYear: (direction: 'prev' | 'next') => void;
    monthlyContribution: number;
    totalAnnualBudget: number;
}

export const BudgetYearNavigation = ({
    selectedYear,
    minYear,
    maxYear,
    availableYears,
    onYearChange,
    navigateYear,
    monthlyContribution,
    totalAnnualBudget
}: BudgetYearNavigationProps) => {
    return (

        <div className="flex items-center gap-2 bg-background/50 p-1 rounded-xl border border-border/50 shadow-sm">
            <Button
                variant="outline"
                size="sm"
                onClick={() => navigateYear('prev')}
                disabled={selectedYear <= minYear}
                className="h-8 w-8 p-0"
            >
                <ChevronLeft className="w-4 h-4" />
            </Button>

            <select
                value={selectedYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="px-3 py-1 bg-transparent font-bold text-sm focus:outline-none cursor-pointer"
            >
                {availableYears.map(year => (
                    <option key={year} value={year}>
                        {year}
                    </option>
                ))}
            </select>

            <Button
                variant="outline"
                size="sm"
                onClick={() => navigateYear('next')}
                disabled={selectedYear >= maxYear}
                className="h-8 w-8 p-0"
            >
                <ChevronRightIcon className="w-4 h-4" />
            </Button>
        </div>
    );
};
