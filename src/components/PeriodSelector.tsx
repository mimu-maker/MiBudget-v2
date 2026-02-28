import React from 'react';
import { usePeriod } from '@/contexts/PeriodContext';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from 'lucide-react';
import { getQuarter, getMonth } from 'date-fns';

export const PeriodSelector = () => {
    const { selectedPeriod, setSelectedPeriod, customDateRange, setCustomDateRange } = usePeriod();

    const specialOptions = React.useMemo(() => {
        const options: { label: string, value: string }[] = [];

        // Year to Date
        options.push({ label: 'Year to Date', value: 'Year to Date' });

        // This Quarter
        options.push({ label: 'This Quarter', value: 'This Quarter' });

        return options;
    }, []);

    // Set default value if not set or if it was a saved value that's no longer preferred
    React.useEffect(() => {
        if (!localStorage.getItem('mibudget_selected_period_v2')) {
            setSelectedPeriod('Last 6M');
        }
    }, [setSelectedPeriod]);

    return (
        <div className="flex flex-col items-center gap-2">
            <Tabs
                value={selectedPeriod}
                onValueChange={(val: any) => setSelectedPeriod(val)}
                className="w-auto"
            >
                <TabsList className="bg-muted/50 p-1 h-12 rounded-full border border-border/50 shadow-sm">
                    <TabsTrigger
                        value="All"
                        className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all font-bold tracking-tight"
                    >
                        All
                    </TabsTrigger>
                    <TabsTrigger
                        value={(new Date().getFullYear() - 1).toString()}
                        className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all font-bold tracking-tight"
                    >
                        {new Date().getFullYear() - 1}
                    </TabsTrigger>
                    <TabsTrigger
                        value="Last 6M"
                        className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all font-bold tracking-tight"
                    >
                        Last 6M
                    </TabsTrigger>

                    {specialOptions.map((opt) => (
                        <TabsTrigger
                            key={opt.value}
                            value={opt.value}
                            className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all font-bold tracking-tight"
                        >
                            {opt.label}
                        </TabsTrigger>
                    ))}

                    <TabsTrigger
                        value="Custom"
                        className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all font-bold tracking-tight gap-2"
                    >
                        <Calendar className="w-4 h-4" />
                        Custom
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {selectedPeriod === 'Custom' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <DatePickerWithRange
                        date={customDateRange}
                        setDate={setCustomDateRange}
                        maxDate={new Date()}
                    />
                </div>
            )}
        </div>
    );
};
