import React from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import SignInScreen from '@/components/Auth/SignInScreen';
import UserSetup from '@/components/Auth/UserSetup';
import { LocalLogin } from './LocalLogin';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, userProfile, loading, isLocalAuth } = useUnifiedAuth();
  const bypass = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  console.log('🧪 [ProtectedRoute] bypass?', bypass);
  console.log('🧪 [ProtectedRoute] isLocalAuth?', isLocalAuth);
  console.log('🧪 [ProtectedRoute] user?', user);
  console.log('🧪 [ProtectedRoute] userProfile?', userProfile);

  if (bypass) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    if (isLocalAuth) {
      return <LocalLogin />;
    }
    return <SignInScreen />;
  }

  // Completely bypass UserSetup for simplified implementation
  // Users go directly to main app after authentication
  // No setup screens should ever show for Michael and Tanja
  
  return <>{children}</>;
};

export default ProtectedRoute;