import React, { useState } from 'react';
import { useAuth } from '@/contexts/UnifiedAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, PlayCircle, Wallet } from 'lucide-react';

const SignInScreen: React.FC = () => {
  const { signInWithGoogle, signInWithDemo, loading } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleDemoSignIn = async () => {
    setDemoLoading(true);
    setDemoError(null);
    const error = await signInWithDemo();
    if (error) setDemoError(error);
    setDemoLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-3 bg-blue-600 rounded-full">
                <Wallet className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Welcome to MiBudget
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your personal budget management solution
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button
              onClick={handleSignIn}
              disabled={loading || demoLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
            >
              {loading && !demoLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Continue with Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">or</span>
              </div>
            </div>

            <Button
              onClick={handleDemoSignIn}
              disabled={loading || demoLoading}
              variant="outline"
              className="w-full font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3"
            >
              {demoLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 text-green-600" />
                  Try Demo
                </>
              )}
            </Button>
            <p className="text-xs text-center text-gray-400">
              Explore with a sample US household budget — no account needed
            </p>
            {demoError && (
              <p className="text-xs text-center text-red-500">{demoError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignInScreen;
