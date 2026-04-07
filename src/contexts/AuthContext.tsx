import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { DeviceTrustDialog } from '@/components/Auth/DeviceTrustDialog';
import { useDeviceTrust } from '@/hooks/useDeviceTrust';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { isEmailAllowed, getMasterEmail, isHouseholdEmail } from '@/lib/authUtils';
import { SessionConflictDialog } from '@/components/Auth/SessionConflictDialog';

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
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionConflict, setSessionConflict] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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

  const updateProfileAndAccount = (profile: any) => {
    setUserProfile(profile);
    if (profile?.current_account_id) {
      setCurrentAccountId(profile.current_account_id);
    } else {
      setCurrentAccountId(null);
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
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.email) {
          const profile = await fetchUserProfile(session.user.id, session.user.email);
          updateProfileAndAccount(profile);

          if (session.user.app_metadata?.provider === 'google' && !isEmailAllowed(session.user.email || '')) {
            await supabase.auth.signOut();
            return;
          }

          // SESSION RESTRICTION: Update and monitor last_session_id
          const newSessionId = crypto.randomUUID();
          setActiveSessionId(newSessionId);
          await (supabase
            .from('user_profiles' as any)
            .update({ last_session_id: newSessionId } as any)
            .eq('user_id', session.user.id) as any);

          // Listen for session conflicts
          const channel = supabase
            .channel(`session-${session.user.id}`)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${session.user.id}` },
              (payload) => {
                if (payload.new.last_session_id !== newSessionId) {
                  setSessionConflict(true);
                }
              }
            )
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        } else {
          updateProfileAndAccount(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        const profile = await fetchUserProfile(session.user.id, session.user.email);
        updateProfileAndAccount(profile);
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
    return null;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      updateProfileAndAccount(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleSessionReplace = async () => {
     if (!user) return;
     const newSessionId = crypto.randomUUID();
     setActiveSessionId(newSessionId);
     await (supabase
       .from('user_profiles' as any)
       .update({ last_session_id: newSessionId } as any)
       .eq('user_id', user.id) as any);
     setSessionConflict(false);
  };

  const handleSessionCancel = () => {
     setSessionConflict(false);
  };

  const value = {
    user,
    session,
    userProfile,
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
      {sessionConflict && (
        <SessionConflictDialog 
          onConfirm={handleSessionReplace}
          onCancel={handleSessionCancel}
        />
      )}
    </AuthContext.Provider>
  );
};
