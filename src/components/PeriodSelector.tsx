import React from 'react';
import { usePeriod } from '@/contexts/PeriodContext';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from 'lucide-react';
import { getQuarter, getMonth } from 'date-fns';

export const PeriodSelector = () => {
    const { selectedPeriod, setSelectedPeriod, customDateRange, setCustomDateRange } = usePeriod();

    // Set default value if not set or if it was a saved value that's no longer preferred
    React.useEffect(() => {
        const saved = localStorage.getItem('mibudget_selected_period_v2');
        if (!saved || saved === 'Last 6M') {
            setSelectedPeriod('6m');
        } else if (saved === 'Year to Date' || saved === 'This Quarter') {
            setSelectedPeriod(saved === 'Year to Date' ? 'YTD' : '90d');
        }
    }, [setSelectedPeriod]);

    return (
        <div className="flex flex-col items-center gap-2">
            <Tabs
                value={selectedPeriod}
                onValueChange={(val: any) => setSelectedPeriod(val)}
                className="w-auto"
            >
                <TabsList className="bg-muted/50 p-1 h-12 rounded-full border border-border/50 shadow-sm flex items-center">
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
                        value="YTD"
                        title="Year to Date"
                        className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all font-bold tracking-tight"
                    >
                        YTD
                    </TabsTrigger>
                    <TabsTrigger
                        value="6m"
                        title="Last 6 months"
                        className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all font-bold tracking-tight"
                    >
                        6m
                    </TabsTrigger>
                    <TabsTrigger
                        value="90d"
                        title="Last 90 days"
                        className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all font-bold tracking-tight"
                    >
                        90d
                    </TabsTrigger>

                    <DatePickerWithRange
                        className="inline-flex m-0 p-0 !grid-cols-1 !gap-0"
                        date={customDateRange}
                        setDate={setCustomDateRange}
                        maxDate={new Date()}
                        trigger={
                            <TabsTrigger
                                value="Custom"
                                title="Custom"
                                className="rounded-full px-5 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all font-bold tracking-tight"
                            >
                                <Calendar className="w-4 h-4" />
                            </TabsTrigger>
                        }
                    />
                </TabsList>
            </Tabs>
        </div>
    );
};
