import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth as useSupabaseAuth } from './AuthContext';
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
  signOut: () => void;
  updateUserProfile: (profile: Partial<UnifiedUserProfile>) => Promise<void>;
  isLocalAuth: boolean;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export const UnifiedAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isLocalAuth = localStorage.getItem('authMode') === 'local';

  // For now, we're only using Supabase auth (local auth disabled)
  const supabaseAuth = useSupabaseAuth();
  const profileContext = useProfile();

  // Use Supabase auth (local auth disabled)
  const user = supabaseAuth.user;
  const userProfile = profileContext.userProfile as UnifiedUserProfile | null;
  const session = supabaseAuth.session;
  const loading = supabaseAuth.loading || profileContext.loading;

  const signIn = async (email: string, password: string) => {
    // For Supabase, you'd need to implement email/password auth
    throw new Error('Email/password auth not implemented for Supabase mode');
  };

  const signUp = async (email: string, password: string, name: string) => {
    throw new Error('Email/password signup not implemented for Supabase mode');
  };

  const signOut = () => {
    return supabaseAuth.signOut();
  };

  const updateUserProfile = async (profile: Partial<UnifiedUserProfile>) => {
    return profileContext.updateUserProfile(profile);
  };

  const value: UnifiedAuthContextType = {
    user,
    userProfile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
    isLocalAuth: false // Always false since local auth is disabled
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
