import React, { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Sparkles } from 'lucide-react';

export const WelcomeStep: React.FC = () => {
  const { userPreferences, updatePreferences, nextPhase, validateCurrentPhase } = useOnboarding();
  const [formData, setFormData] = useState(userPreferences);

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'CHF', label: 'CHF - Swiss Franc' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' }
  ];

  const dateFormats = [
    { value: 'MM/DD/YYYY', label: '12/31/2024' },
    { value: 'DD/MM/YYYY', label: '31/12/2024' },
    { value: 'YYYY-MM-DD', label: '2024-12-31' },
    { value: 'DD.MM.YYYY', label: '31.12.2024' },
    { value: 'DD-MM-YYYY', label: '31-12-2024' }
  ];

  const numberFormats = [
    { value: '1,234.56', label: '1,234.56 (English)' },
    { value: '1.234,56', label: '1.234,56 (European)' },
    { value: '1 234.56', label: '1 234.56 (Space)' },
    { value: '1234.56', label: '1234.56 (No separator)' }
  ];

  const timezones = [
    { value: 'UTC', label: 'UTC - Coordinated Universal Time' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' }
  ];

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    updatePreferences({ [field]: value });
  };

  const handleContinue = () => {
    if (validateCurrentPhase()) {
      nextPhase();
    }
  };

  const isValid = formData.fullName.trim() !== '' && formData.accountName.trim() !== '';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-primary/10 rounded-full">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Welcome to MiBudget</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Let's set up your personalized budgeting experience. We'll start with some basic preferences to make MiBudget work perfectly for you.
        </p>
      </div>

      {/* Preferences Form */}
      <Card>
        <CardHeader>
          <CardTitle>Your Preferences</CardTitle>
          <CardDescription>
            These settings will be used throughout MiBudget to display information in your preferred format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="Enter your full name"
                className="w-full"
              />
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <Label htmlFor="accountName">Budget Name</Label>
              <Input
                id="accountName"
                value={formData.accountName}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                placeholder="My Budget"
                className="w-full"
              />
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Format */}
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select value={formData.dateFormat} onValueChange={(value) => handleInputChange('dateFormat', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Number Format */}
            <div className="space-y-2">
              <Label htmlFor="numberFormat">Number Format</Label>
              <Select value={formData.numberFormat} onValueChange={(value) => handleInputChange('numberFormat', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select number format" />
                </SelectTrigger>
                <SelectContent>
                  {numberFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={formData.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Preview</h4>
            <div className="text-sm space-y-1">
              <div>Amount: {formData.numberFormat.replace('1,234.56', '1,234.56').replace('1.234,56', '1.234,56').replace('1 234.56', '1 234.56').replace('1234.56', '1234.56')}</div>
              <div>Date: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: formData.dateFormat.includes('MM') ? '2-digit' : 'short',
                day: '2-digit'
              })}</div>
              <div>Currency: {formData.currency}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleContinue}
          disabled={!isValid}
          size="lg"
          className="flex items-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
