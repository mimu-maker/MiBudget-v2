
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { usePeriod } from '@/contexts/PeriodContext';
import { MainOverview } from './MainOverview';
import { SpecialOverview } from './SpecialOverview';
import { KlintemarkenOverview } from './KlintemarkenOverview';
import { ReconciliationOverview } from './ReconciliationOverview';
import { HistoryDashboard } from './HistoryDashboard';

export const OverviewTabs = () => {
  const { selectedPeriod, setSelectedPeriod } = usePeriod();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>

        <div className="w-48">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full bg-white">
              <Calendar className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="This month">This month</SelectItem>
              <SelectItem value="Last Month">Last Month</SelectItem>
              <SelectItem value="This Quarter">This Quarter</SelectItem>
              <SelectItem value="Last Quarter">Last Quarter</SelectItem>
              <SelectItem value="This Year">This Year</SelectItem>
              <SelectItem value="Last Year">Last Year</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="main" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="main">Main</TabsTrigger>
          <TabsTrigger value="special">Special</TabsTrigger>
          <TabsTrigger value="klintemarken">Klintemarken</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="mt-6">
          <MainOverview />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryDashboard />
        </TabsContent>

        <TabsContent value="special" className="mt-6">
          <SpecialOverview />
        </TabsContent>

        <TabsContent value="klintemarken" className="mt-6">
          <KlintemarkenOverview />
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-6">
          <ReconciliationOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
};
