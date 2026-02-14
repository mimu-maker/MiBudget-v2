import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BudgetYearTabsProps {
    selectedYear: number;
    availableYears: number[];
    onYearChange: (year: number) => void;
    isFallback?: boolean;
}

export const BudgetYearTabs = ({
    selectedYear,
    availableYears,
    onYearChange,
    isFallback
}: BudgetYearTabsProps) => {
    return (
        <div className="w-full flex items-center justify-center gap-4 py-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 px-6 shadow-sm">
            <Tabs
                value={selectedYear.toString()}
                onValueChange={(val) => onYearChange(Number(val))}
                className="w-full max-w-2xl"
            >
                <TabsList className="w-full bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 h-12 p-1.5 rounded-full shadow-inner">
                    {availableYears.map(year => (
                        <TabsTrigger
                            key={year}
                            value={year.toString()}
                            className={cn(
                                "flex-1 rounded-full text-sm font-bold transition-all data-[state=active]:shadow-lg",
                                "data-[state=active]:bg-blue-600 data-[state=active]:text-white",
                                "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {year}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {isFallback && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <Badge className="bg-amber-500 text-white border-none text-[10px] font-black uppercase tracking-widest px-3 py-1 shadow-lg shadow-amber-500/20 animate-pulse">
                        Draft
                    </Badge>
                </div>
            )}
        </div>
    );
};
