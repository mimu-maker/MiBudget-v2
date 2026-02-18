import { PeriodSelector } from '@/components/PeriodSelector';
import { usePeriod } from '@/contexts/PeriodContext';
import { MainOverview } from './MainOverview';

import { SpecialOverview } from './SpecialOverview';
import { KlintemarkenOverview } from './KlintemarkenOverview';
import { CategoryOverview } from './CategoryOverview';
import { ReconciliationOverview } from './ReconciliationOverview';
import { HistoryDashboard } from './HistoryDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, PiggyBank, Wallet, PieChart, Link, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const OverviewTabs = ({ defaultTab = "main" }: { defaultTab?: string }) => {
  return (
    <div className="p-6">
      <Tabs defaultValue={defaultTab} className="space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex justify-start">
            <TabsList className="bg-muted/50 p-1.5 h-12 rounded-full border border-border/50 shadow-sm">
              <TabsTrigger
                value="main"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="font-bold tracking-tight">Main Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all gap-2"
              >
                <PieChart className="w-4 h-4" />
                <span className="font-bold tracking-tight">Category Analysis</span>
              </TabsTrigger>
              <TabsTrigger
                value="special"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all gap-2"
              >
                <PiggyBank className="w-4 h-4" />
                <span className="font-bold tracking-tight">Slush Fund</span>
              </TabsTrigger>
              <TabsTrigger
                value="klintemarken"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span className="font-bold tracking-tight">Feeder Budgets</span>
              </TabsTrigger>
              <TabsTrigger
                value="recon"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all gap-2"
              >
                <Link className="w-4 h-4" />
                <span className="font-bold tracking-tight">Recon Pivot</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all gap-2"
              >
                <History className="w-4 h-4" />
                <span className="font-bold tracking-tight">History</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center space-x-2">
            <PeriodSelector />
          </div>
        </div>

        <TabsContent value="main" className="outline-none animate-in fade-in-50 duration-500">
          <MainOverview />
        </TabsContent>
        <TabsContent value="categories" className="outline-none animate-in fade-in-50 duration-500">
          <CategoryOverview includeSpecial={false} includeKlintemarken={false} />
        </TabsContent>
        <TabsContent value="special" className="outline-none animate-in fade-in-50 duration-500">
          <SpecialOverview />
        </TabsContent>
        <TabsContent value="klintemarken" className="outline-none animate-in fade-in-50 duration-500">
          <KlintemarkenOverview />
        </TabsContent>
        <TabsContent value="recon" className="outline-none animate-in fade-in-50 duration-500">
          <ReconciliationOverview />
        </TabsContent>
        <TabsContent value="history" className="outline-none animate-in fade-in-50 duration-500">
          <HistoryDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};
