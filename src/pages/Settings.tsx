import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from '@/hooks/useSettings';
import { useCategorySource } from '@/hooks/useBudgetCategories';

// Import refactored components
import { GeneralSettings } from '@/components/Settings/GeneralSettings';
import { UnifiedCategoryManager } from '@/components/Settings/UnifiedCategoryManager';
import { MerchantManager } from '@/components/Settings/MerchantManager';
import { EmergencyDataManagement } from '@/components/Settings/EmergencyDataManagement';

import UserManagement from '@/components/Settings/UserManagement';
import { cn } from '@/lib/utils';

const Settings = () => {
  const {
    settings,
    saveSettings
  } = useSettings();

  const { categories: displayCategories, subCategories: displaySubCategories } = useCategorySource();

  const [saveMessage] = useState('');

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

      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="budget" className="px-6">Budget Categories</TabsTrigger>
          <TabsTrigger value="merchants" className="px-6">Merchant Rules</TabsTrigger>
          <TabsTrigger value="users" className="px-6">Users</TabsTrigger>
          <TabsTrigger value="general" className="px-6">General</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-8">

          <UnifiedCategoryManager />

          {/* Budget Balancing Card */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">Budget Balancing</CardTitle>
                <CardDescription>Automatically overflow unspent budget to any category or sub-category you want.</CardDescription>
              </div>
              <Switch
                checked={!!settings.balancingSubCategory}
                onCheckedChange={(checked) => {
                  if (checked) {
                    // Try to find a default "Savings" or "Opsparing" category
                    const defaultCat = displayCategories.find(c => c.toLowerCase().includes('saving') || c.toLowerCase().includes('opsparing')) || displayCategories[0];
                    const defaultSub = displaySubCategories[defaultCat]?.[0] || '';
                    saveSettings({ balancingSubCategory: { category: defaultCat, subCategory: defaultSub } });
                  } else {
                    saveSettings({ balancingSubCategory: null });
                  }
                }}
              />
            </CardHeader>
            <CardContent className="pt-6">
              <div className={cn("space-y-4 transition-all duration-300", !settings.balancingSubCategory && "opacity-50 grayscale pointer-events-none")}>
                <p className="text-sm text-slate-600">
                  When enabled, any monthly budget surplus (or deficit) will be automatically applied to this category.
                </p>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs uppercase font-bold text-slate-500">Target Category</Label>
                    <Select
                      value={settings.balancingSubCategory?.category || ''}
                      onValueChange={(cat) => saveSettings({ balancingSubCategory: { category: cat, subCategory: displaySubCategories[cat]?.[0] || '' } })}
                      disabled={!settings.balancingSubCategory}
                    >
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue placeholder="Select Category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {displayCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs uppercase font-bold text-slate-500">Target Sub-category</Label>
                    <Select
                      value={settings.balancingSubCategory?.subCategory || ''}
                      onValueChange={(sub) => saveSettings({ balancingSubCategory: { ...settings.balancingSubCategory!, subCategory: sub } })}
                      disabled={!settings.balancingSubCategory || !settings.balancingSubCategory?.category}
                    >
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue placeholder="Select Sub-category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(displaySubCategories[settings.balancingSubCategory?.category || ''] || []).map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

        <TabsContent value="merchants">
          <MerchantManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
