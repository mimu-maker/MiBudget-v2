import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from '@/hooks/useSettings';
import { useCategorySource } from '@/hooks/useBudgetCategories';

// Import refactored components
import { GeneralSettings } from '@/components/Settings/GeneralSettings';
import { UnifiedCategoryManager } from '@/components/Settings/UnifiedCategoryManager';
import { SourceManager } from '@/components/Settings/SourceManager';
import { NoiseFilterSettings } from '@/components/Settings/NoiseFilterSettings';
import { EmergencyDataManagement } from '@/components/Settings/EmergencyDataManagement';

import UserManagement from '@/components/Settings/UserManagement';
import { cn } from '@/lib/utils';

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'budget';
  const initialSearch = searchParams.get('search') || '';

  const {
    settings,
    saveSettings
  } = useSettings();

  const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();

  const [saveMessage] = useState('');

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set('tab', value);
      return prev;
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1">Manage budget categories, users, and application defaults.</p>
        </div>
      </div>

      {saveMessage && (
        <Alert className={saveMessage.includes('No new') ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-100 text-green-800"}>
          <AlertTitle>System Notification</AlertTitle>
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="budget" className="px-6">Budget Categories</TabsTrigger>
          <TabsTrigger value="sources" className="px-6">Source Rules</TabsTrigger>
          <TabsTrigger value="users" className="px-6">Users</TabsTrigger>
          <TabsTrigger value="general" className="px-6">General</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-8">

          <UnifiedCategoryManager />

          {/* Budget Balancing Card */}
          {settings.enableBudgetBalancing && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    Budget Balancing
                    <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-600 border-indigo-200 font-bold uppercase">Beta</Badge>
                  </CardTitle>
                  <CardDescription>Automatically overflow unspent budget to any category or sub-category you want.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="opacity-40 pointer-events-none grayscale">
                    <p className="text-sm text-slate-600 mb-4">
                      When enabled, any monthly budget surplus (or deficit) will be automatically applied to this category.
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs uppercase font-bold text-slate-500">Target Category</Label>
                        <Select disabled={true}>
                          <SelectTrigger className="h-10 bg-white">
                            <SelectValue placeholder="Disabled..." />
                          </SelectTrigger>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs uppercase font-bold text-slate-500">Target Sub-category</Label>
                        <Select disabled={true}>
                          <SelectTrigger className="h-10 bg-white">
                            <SelectValue placeholder="Disabled..." />
                          </SelectTrigger>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          {/* New Account Localization Settings */}
          <GeneralSettings />

          {/* Legacy Preferences (Dark Mode) */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b bg-slate-50/50">
              <CardTitle className="text-lg font-semibold text-slate-800">Visual Preferences</CardTitle>
              <CardDescription>Customize your local device appearance.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 h-10">
                <Switch
                  id="dark-mode"
                  checked={settings.darkMode}
                  onCheckedChange={(val) => saveSettings({ darkMode: val })}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <Label htmlFor="dark-mode" className="text-slate-600 font-bold">Dark Mode</Label>
              </div>
            </CardContent>
          </Card>

          <EmergencyDataManagement />
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <Tabs defaultValue="management" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
              <TabsTrigger value="management" className="text-sm font-bold h-10">Scan & Match Logic</TabsTrigger>
              <TabsTrigger value="filters" className="text-sm font-bold h-10">System Noise Filters</TabsTrigger>
            </TabsList>
            <TabsContent value="management">
              <SourceManager initialSearch={initialSearch} />
            </TabsContent>
            <TabsContent value="filters">
              <NoiseFilterSettings />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
