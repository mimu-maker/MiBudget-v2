import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DownloadCloud } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { generateBackupData, downloadBackupFile } from '@/lib/driveExport';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';

export const GeneralSettings = () => {
    const { userProfile, updateUserProfile, loading } = useProfile();
    const { settings, saveSettings } = useSettings();
    const { user } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [backingUp, setBackingUp] = useState(false);

    // Local state for tracking changes
    const [formData, setFormData] = useState({
        language: userProfile?.language || 'en-US',
        currency: userProfile?.currency || 'DKK',
        date_format: userProfile?.date_format || 'YY/MM/DD',
        amount_format: userProfile?.amount_format || 'comma_decimal',
        show_time: userProfile?.show_time || false
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateUserProfile({
                language: formData.language as 'en-US' | 'da-DK',
                currency: formData.currency,
                date_format: formData.date_format as any,
                amount_format: formData.amount_format as any,
                show_time: formData.show_time
            });
            toast({
                title: "Settings Saved",
                description: "Your localization preferences have been updated.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save settings. Please try again.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleBackup = async () => {
        if (!user) return;
        setBackingUp(true);
        try {
            toast({
                title: "Preparing Backup",
                description: "Gathering your database records...",
            });
            const backupData = await generateBackupData(user.id);
            downloadBackupFile(backupData);
            toast({
                title: "Backup Complete",
                description: "Your data has been successfully downloaded.",
            });
        } catch (error: any) {
            console.error("Backup failed", error);
            toast({
                title: "Backup Failed",
                description: error.message || "Could not generate backup.",
                variant: "destructive"
            });
        } finally {
            setBackingUp(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Account Localization</CardTitle>
                    <CardDescription>
                        These settings apply to the shared Master Account (viewable by all family members).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* Language Selection */}
                    <div className="flex flex-col space-y-2">
                        <Label htmlFor="language">Interface Language</Label>
                        <Select
                            value={formData.language}
                            onValueChange={(val) => setFormData({ ...formData, language: val as any })}
                        >
                            <SelectTrigger id="language">
                                <SelectValue placeholder="Select Language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en-US">English (US)</SelectItem>
                                <SelectItem value="da-DK">Danish (Dansk)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[0.8rem] text-muted-foreground">
                            Controls the text labels throughout the application.
                        </p>
                    </div>

                    {/* Currency Selection */}
                    <div className="flex flex-col space-y-2">
                        <Label htmlFor="currency">Primary Currency</Label>
                        <Select
                            value={formData.currency}
                            onValueChange={(val) => setFormData({ ...formData, currency: val })}
                        >
                            <SelectTrigger id="currency">
                                <SelectValue placeholder="Select Currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DKK">Danish Krone (kr)</SelectItem>
                                <SelectItem value="USD">US Dollar ($)</SelectItem>
                                <SelectItem value="EUR">Euro (€)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Format */}
                    <div className="flex flex-col space-y-2">
                        <Label htmlFor="dateFormat">Date Format</Label>
                        <Select
                            value={formData.date_format}
                            onValueChange={(val) => setFormData({ ...formData, date_format: val as any })}
                        >
                            <SelectTrigger id="dateFormat">
                                <SelectValue placeholder="Select Date Format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="YY/MM/DD">YY/MM/DD (24/12/31)</SelectItem>
                                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount Format */}
                    <div className="flex flex-col space-y-2">
                        <Label htmlFor="amountFormat">Number Format</Label>
                        <Select
                            value={formData.amount_format}
                            onValueChange={(val) => setFormData({ ...formData, amount_format: val as any })}
                        >
                            <SelectTrigger id="amountFormat">
                                <SelectValue placeholder="Select Number Format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="comma_decimal">1.000,00 (Danish)</SelectItem>
                                <SelectItem value="dot_decimal">1,000.00 (US/UK)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="showTime">Show Time in Dates</Label>
                            <p className="text-[0.8rem] text-muted-foreground">
                                Detailed timestamps for transactions (useful for tracking duplicates).
                            </p>
                        </div>
                        <Switch
                            id="showTime"
                            checked={formData.show_time}
                            onCheckedChange={(val) => setFormData({ ...formData, show_time: val })}
                        />
                    </div>


                    <div className="pt-4">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>

                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>
                        Export your budget data for safekeeping.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col space-y-2">
                        <Label>Export Local Backup</Label>
                        <p className="text-[0.8rem] text-muted-foreground pb-2">
                            Download a full JSON snapshot of your transactions, categories, and settings.
                            We recommend doing this regularly.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto flex items-center gap-2"
                            onClick={handleBackup}
                            disabled={backingUp}
                        >
                            {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                            {backingUp ? "Generating Backup..." : "Download Full Data Backup (.json)"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-indigo-200 shadow-sm bg-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Loader2 className="w-24 h-24 text-indigo-900" />
                </div>
                <CardHeader className="pb-4 border-b bg-indigo-50/50">
                    <CardTitle className="text-lg font-semibold text-indigo-900">Beta Features</CardTitle>
                    <CardDescription className="text-indigo-700/70">
                        Experimental features that are not yet fully supported. Use at your own risk.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="feeder-budgets" className="text-base text-indigo-900 font-bold">Feeder Budgets</Label>
                            <p className="text-[0.85rem] text-indigo-700/70 max-w-sm">
                                Enable tracking for feeder budgets (property companies, holdings) separated from your main spending.
                            </p>
                        </div>
                        <Switch
                            id="feeder-budgets"
                            checked={settings.enableFeederBudgets}
                            onCheckedChange={(val) => saveSettings({ enableFeederBudgets: val })}
                            className="data-[state=checked]:bg-indigo-500"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-indigo-100/50 mt-6">
                        <div className="space-y-0.5">
                            <Label htmlFor="budget-balancing" className="text-base text-indigo-900 font-bold">Budget Balancing</Label>
                            <p className="text-[0.85rem] text-indigo-700/70 max-w-sm">
                                Automatically overflow unspent budget to any category or sub-category you want. Currently experimental.
                            </p>
                        </div>
                        <Switch
                            id="budget-balancing"
                            checked={settings.enableBudgetBalancing}
                            onCheckedChange={(val) => saveSettings({ enableBudgetBalancing: val })}
                            className="data-[state=checked]:bg-indigo-500"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
