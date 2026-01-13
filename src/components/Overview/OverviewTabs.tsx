
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainOverview } from './MainOverview';
import { SpecialOverview } from './SpecialOverview';
import { KlintemarkenOverview } from './KlintemarkenOverview';
import { ReconciliationOverview } from './ReconciliationOverview';
import { HistoryDashboard } from './HistoryDashboard';

export const OverviewTabs = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

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
