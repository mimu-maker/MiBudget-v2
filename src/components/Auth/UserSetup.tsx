import React, { useState } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Globe, DollarSign, CheckCircle } from 'lucide-react';

interface UserProfile {
  full_name: string;
  currency: string;
  timezone: string;
}

const UserSetup: React.FC = () => {
  const { user, userProfile, updateUserProfile } = useUnifiedAuth();
  const [profile, setProfile] = useState<UserProfile>({
    full_name: userProfile?.full_name || user?.name || '',
    currency: 'DKK', // Fixed to DKK
    timezone: 'Europe/Copenhagen' // Fixed to CET
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fixed currency and timezone for simplified implementation
  const currencies = [
    { value: 'DKK', label: 'DKK - Danish Krone' }
  ];

  const timezones = [
    { value: 'Europe/Copenhagen', label: 'Copenhagen (CET/CEST)' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile.full_name.trim()) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateUserProfile(profile);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Setup Complete!
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your MiBudget account is ready. All amounts will be shown in Danish Krone (DKK) with dates in YY/MM/DD format.
              </CardDescription>
            </div>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 rounded-full">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Welcome to MiBudget
            </CardTitle>
            <CardDescription className="text-gray-600">
              Complete your profile to get started with your personal budget tracker
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              <Input
                id="full_name"
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter your full name"
                className="w-full"
                required
              />
            </div>

            {/* Fixed configuration display - not editable */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                <span>Currency: DKK (Danish Krone)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Globe className="w-4 h-4" />
                <span>Timezone: Copenhagen (CET)</span>
              </div>
            </div>

            <Button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSetup;
