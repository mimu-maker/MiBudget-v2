import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { DeviceTrustDialog } from '@/components/Auth/DeviceTrustDialog';
import { useDeviceTrust } from '@/hooks/useDeviceTrust';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { isEmailAllowed, getMasterEmail, isHouseholdEmail } from '@/lib/authUtils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any | null; 
  currentAccountId: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithDemo: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [currentAccount, setCurrentAccount] = useState<any | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    showDeviceTrustDialog,
    pendingDeviceId,
    showDeviceTrustPrompt,
    handleDeviceTrust,
    handleDeviceDontTrust,
    getDeviceId,
    isDeviceTrusted,
  } = useDeviceTrust();

  // Initialize Session Timer Hook
  useSessionTimer(session, isDeviceTrusted(), async () => {
    await signOut();
  });

  const updateProfileAndAccount = async (profile: any) => {
    setUserProfile(profile);
    if (profile?.current_account_id) {
      setCurrentAccountId(profile.current_account_id);
      // Fetch account details (for currency etc)
      const { data: account } = await supabase
        .from('accounts' as any)
        .select('*')
        .eq('id', profile.current_account_id)
        .maybeSingle();
      setCurrentAccount(account);
    } else {
      setCurrentAccountId(null);
      setCurrentAccount(null);
    }
  };

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading(isLoading => {
        if (isLoading) console.warn('⚠️ Auth loading safety timeout triggered');
        return false;
      });
    }, 5000);

    const bypass = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
    if (bypass) {
      const mockUser = { id: 'dev-user', email: 'dev@example.com' } as User;
      setUser(mockUser);
      setSession({ user: mockUser } as Session);
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // TOKEN_REFRESHED is a silent background token rotation triggered by tab focus.
        // Updating user/session here creates new object references → ProfileContext
        // re-fetches on every focus event. Just keep the fresh token and bail.
        if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.email) {
          const profile = await fetchUserProfile(session.user.id, session.user.email);
          await updateProfileAndAccount(profile);

          if (session.user.app_metadata?.provider === 'google' && !isEmailAllowed(session.user.email || '')) {
            await supabase.auth.signOut();
            return;
          }
        } else {
          await updateProfileAndAccount(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        const profile = await fetchUserProfile(session.user.id, session.user.email);
        await updateProfileAndAccount(profile);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles' as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles' as any)
          .insert([{ user_id: userId, email, full_name: user?.user_metadata?.full_name || email }])
          .select()
          .single();
        if (insertError) throw insertError;
        return newProfile;
      }
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in failed:', error);
      setLoading(false);
    }
  };

  const signInWithDemo = async (): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'demo@example.com',
      password: 'demo123',
    });
    if (error) {
      console.error('Demo sign in failed:', error);
      return error.message;
    }
    // Always reset demo data on login so every session starts clean
    try {
      await supabase.rpc('reset_demo_account');
    } catch (e) {
      console.warn('Demo reset failed (non-fatal):', e);
    }
    return null;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      await updateProfileAndAccount(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const value = {
    user,
    session,
    userProfile,
    currentAccount,
    currentAccountId,
    loading,
    signInWithGoogle,
    signInWithDemo,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showDeviceTrustDialog && pendingDeviceId && (
        <DeviceTrustDialog
          deviceId={pendingDeviceId}
          onTrust={() => handleDeviceTrust()}
          onDontTrust={() => handleDeviceDontTrust()}
          onLogout={signOut}
        />
      )}
    </AuthContext.Provider>
  );
};
