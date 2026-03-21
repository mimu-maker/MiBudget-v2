import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth as useSupabaseAuth } from './AuthContext';
import { useLocalAuth } from './LocalAuthContext';
import { useProfile } from './ProfileContext';

interface UnifiedUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

interface UnifiedUserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  currency: string;
  timezone: string;
  role: 'admin' | 'editor' | 'viewer' | 'restrict';
  is_setup_complete: boolean;
  created_at: string;
  updated_at: string;
  date_format?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'YY/MM/DD';
  number_format?: string;
  onboarding_step?: number;
  import_completed?: boolean;
  language?: 'en-US' | 'da-DK';
  amount_format?: 'comma_decimal' | 'dot_decimal';
}

interface UnifiedAuthContextType {
  user: UnifiedUser | null;
  userProfile: UnifiedUserProfile | null;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  updateUserProfile: (profile: Partial<UnifiedUserProfile>) => Promise<void>;
  isLocalAuth: boolean;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export const UnifiedAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isLocalAuth = localStorage.getItem('authMode') === 'local';

  // We unconditionally call both hooks, as required by React rules
  const supabaseAuth = useSupabaseAuth();
  const localAuth = useLocalAuth();
  const profileContext = useProfile();

  // Switch between them based on isLocalAuth
  const user = isLocalAuth ? localAuth.user : supabaseAuth.user;
  const userProfile = isLocalAuth ? localAuth.userProfile : profileContext.userProfile as UnifiedUserProfile | null;
  const session = isLocalAuth ? localAuth.session : supabaseAuth.session;
  const loading = isLocalAuth ? localAuth.loading : (supabaseAuth.loading || profileContext.loading);

  const signIn = isLocalAuth
    ? localAuth.signIn
    : async () => { throw new Error('Email/password auth not implemented for Supabase mode'); };

  const signUp = isLocalAuth
    ? localAuth.signUp
    : async () => { throw new Error('Email/password signup not implemented for Supabase mode'); };

  const signOut = isLocalAuth
    ? () => { localAuth.signOut(); localStorage.removeItem('authMode'); window.location.reload(); }
    : supabaseAuth.signOut;

  const signInWithGoogle = isLocalAuth
    ? async () => { throw new Error('Google Sign In is not available in local test mode. Click Bypass.') }
    : supabaseAuth.signInWithGoogle;

  const updateUserProfile = isLocalAuth
    ? localAuth.updateUserProfile as any
    : profileContext.updateUserProfile;

  const value: UnifiedAuthContextType = {
    user: user as any,
    userProfile: userProfile as any,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateUserProfile,
    isLocalAuth
  };

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};

export const useUnifiedAuth = (): UnifiedAuthContextType => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
};

// Backward compatibility - export useAuth that points to unified auth
export const useAuth = useUnifiedAuth;
