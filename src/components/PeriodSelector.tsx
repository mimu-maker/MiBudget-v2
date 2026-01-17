import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { usePeriod } from '@/contexts/PeriodContext';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useTransactionTable } from '@/components/Transactions/hooks/useTransactionTable';
import { parseISO, getYear } from 'date-fns';

export const PeriodSelector = () => {
    const { selectedPeriod, setSelectedPeriod, customDateRange, setCustomDateRange } = usePeriod();
    const { transactions } = useTransactionTable();

    const availableYears = React.useMemo(() => {
        const years = new Set<number>();
        const currentYear = new Date().getFullYear();
        years.add(currentYear);

        transactions.forEach(t => {
            try {
                if (t.date) {
                    const year = getYear(parseISO(t.date));
                    if (year) years.add(year);
                }
            } catch (e) { }
        });

        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);

    return (
        <div className="flex items-center gap-2">
            <div className="w-48">
                <Select value={selectedPeriod} onValueChange={(val: any) => setSelectedPeriod(val)}>
                    <SelectTrigger className="w-full bg-[var(--background)] shadow-sm border-border">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="This month">This month</SelectItem>
                        <SelectItem value="Last Month">Last Month</SelectItem>
                        <SelectItem value="This Quarter">This Quarter</SelectItem>
                        <SelectItem value="Last Quarter">Last Quarter</SelectItem>
                        <SelectItem value="Year to Date">Year to Date</SelectItem>
                        <SelectItem value="This Year">This Year</SelectItem>
                        <SelectItem value="Last Year">Last Year</SelectItem>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                        <SelectItem value="Custom">Custom Range...</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {selectedPeriod === 'Custom' && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                    <DatePickerWithRange
                        date={customDateRange}
                        setDate={setCustomDateRange}
                    />
                </div>
            )}
        </div>
    );
};
