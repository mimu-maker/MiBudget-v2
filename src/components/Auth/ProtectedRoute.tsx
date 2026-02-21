import React, { useEffect } from 'react';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import SignInScreen from '@/components/Auth/SignInScreen';
import UserSetup from '@/components/Auth/UserSetup';
import { LocalLogin } from './LocalLogin';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, userProfile, loading, isLocalAuth } = useUnifiedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // console.log('🧪 [ProtectedRoute] isLocalAuth?', isLocalAuth);
  // console.log('🧪 [ProtectedRoute] user?', user);
  // console.log('🧪 [ProtectedRoute] userProfile?', userProfile);

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

  // No setup screens should ever show for Michael and Tanja

  // Enforce Restrict Role Limits
  // "Restrict" users can ONLY access:
  // - / (Overview)
  // - /budget (Budget)
  // - /klintemarken (Special sub-overview)
  // - /special (Special sub-overview)
  if (userProfile?.role === 'restrict') {
    const allowedPathPrefixes = ['/', '/budget', '/klintemarken', '/special'];
    // Check if the current path starts with any allowed prefix
    // Note: '/' matches everything so we need to be careful.
    // Actually, exact match for '/' or startsWith for others.

    // Simpler allowed list for exact check or prefix check
    const isAllowed =
      location.pathname === '/' ||
      location.pathname.startsWith('/budget') ||
      location.pathname.startsWith('/klintemarken') ||
      location.pathname.startsWith('/special');

    if (!isAllowed) {
      // Redirect to home if trying to access restricted areas
      // e.g. /transactions, /settings, /reconciliation
      // We use useEffect to avoid side-effects during render
      return <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Access Restricted</h2>
        <p>Your account is limited to Overview and Budget views only.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 hover:underline">Return to Overview</button>
      </div>;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;