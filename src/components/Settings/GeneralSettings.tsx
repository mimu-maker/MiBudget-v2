import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export const GeneralSettings = () => {
    const { userProfile, updateUserProfile, loading } = useProfile();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

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
        </div>
    );
};
