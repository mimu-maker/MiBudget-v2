import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cloud, Database, AlertTriangle } from 'lucide-react';

interface AuthSwitcherProps {
  onLocalAuth: () => void;
  onSupabaseAuth: () => void;
}

export const AuthSwitcher: React.FC<AuthSwitcherProps> = ({ onLocalAuth, onSupabaseAuth }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLocalAuth = () => {
    setIsLoading(true);
    setTimeout(() => {
      onLocalAuth();
      setIsLoading(false);
    }, 100);
  };

  const handleSupabaseAuth = () => {
    setIsLoading(true);
    setTimeout(() => {
      onSupabaseAuth();
      setIsLoading(false);
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">MiBudget</h1>
          <p className="mt-2 text-gray-600">Choose Authentication Method</p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Supabase authentication is currently experiencing issues. Local authentication is recommended for testing.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-500" onClick={handleLocalAuth}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Local Authentication
              </CardTitle>
              <CardDescription>
                Use local accounts stored in your browser. Perfect for testing and development.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="default"
                disabled={isLoading}
                onClick={handleLocalAuth}
              >
                {isLoading ? 'Loading...' : 'Use Local Auth'}
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500 opacity-75" onClick={handleSupabaseAuth}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-600" />
                Supabase Authentication
              </CardTitle>
              <CardDescription>
                Use Google OAuth and cloud authentication. May have connection issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                disabled={isLoading}
                onClick={handleSupabaseAuth}
              >
                {isLoading ? 'Loading...' : 'Use Supabase Auth'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-gray-600">
          <p><strong>Recommended:</strong> Use Local Authentication for stable testing</p>
          <p className="mt-1">Test accounts available in Local Auth mode</p>
        </div>
      </div>
    </div>
  );
};
