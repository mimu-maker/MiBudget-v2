import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SignInScreen from './SignInScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const bypass = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  console.log('🧪 [ProtectedRoute] bypass?', bypass);
  console.log('🧪 [ProtectedRoute] user?', user);

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
    return <SignInScreen />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;