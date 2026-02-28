import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { DeviceTrustDialog } from '@/components/Auth/DeviceTrustDialog';
import { useDeviceTrust } from '@/hooks/useDeviceTrust';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { isEmailAllowed } from '@/lib/authUtils';
import { SessionConflictDialog } from '@/components/Auth/SessionConflictDialog';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any | null; // Using any temporarily to unblock; should be UserProfile
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [sessionConflict, setSessionConflict] = useState(false);

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

  useEffect(() => {
    // Safety fallback: if auth hangs for more than 5s, force loading stop
    const safetyTimer = setTimeout(() => {
      setLoading(isLoading => {
        if (isLoading) console.warn('⚠️ Auth loading safety timeout triggered - forcing UI check');
        return false;
      });
    }, 5000);

    // Dev Bypass Logic
    const bypass = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
    const screenshotBypass = import.meta.env.VITE_E2E_SCREENSHOTS === 'true';

    if (bypass || screenshotBypass) {
      console.warn('⚠️ Bypassing Supabase login (dev/screenshot mode)');
      const mockUser = {
        id: 'dev-user',
        email: 'dev@example.com',
        role: 'authenticated',
        app_metadata: { provider: 'google' },
        user_metadata: { full_name: 'Dev User' },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as User;
      setUser(mockUser);
      setSession({ user: mockUser } as Session);
      setLoading(false);
      return;
    }

    // Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Robust profile fetching with timeout race
          const profilePromise = fetchUserProfile(session.user.id);
          const timeoutPromise = new Promise<any>(resolve => setTimeout(() => resolve(null), 5000));

          const profile = await Promise.race([profilePromise, timeoutPromise]);

          if (!profile) {
            // Keep the promise alive to update state if it eventually resolves later
            profilePromise.then(p => { if (p) setUserProfile(p); });
            console.warn('⚠️ Profile fetch timed out or failed, proceeding without profile');
          }

          setUserProfile(profile);

          // Check email restriction
          if (session.user.app_metadata?.provider === 'google' && !isEmailAllowed(session.user.email || '')) {
            console.error('Email not allowed:', session.user.email);
            await supabase.auth.signOut();
            alert('Access denied. This email is not authorized to use this application.');
            return;
          }

          // Check device trust for new devices
          const deviceId = getDeviceId();
          const isTrusted = isDeviceTrusted();
          const isNewDevice = !localStorage.getItem(`device_trusted_${deviceId}`);

          if (isNewDevice && !isTrusted) {
            // TODO: [PRE-PROD] Re-enable Device Trust Prompt
            // showDeviceTrustPrompt(deviceId);
          }
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    // Initial check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Robust profile fetching with timeout race
        const profilePromise = fetchUserProfile(session.user.id);
        const timeoutPromise = new Promise<any>(resolve => setTimeout(() => resolve(null), 5000));

        const profile = await Promise.race([profilePromise, timeoutPromise]);

        if (!profile) {
          // Keep the promise alive to update state if it eventually resolves later
          profilePromise.then(p => { if (p) setUserProfile(p); });
          console.warn('⚠️ Profile fetch timed out or failed (initial), proceeding without profile');
        }

        setUserProfile(profile);

        // Check email restriction
        if (session.user.app_metadata?.provider === 'google' && !isEmailAllowed(session.user.email || '')) {
          await supabase.auth.signOut();
          return;
        }
        // Device trust check for existing session
        const deviceId = getDeviceId();
        const isTrusted = isDeviceTrusted();
        const hasDeviceRecord = localStorage.getItem(`device_trusted_${deviceId}`);
        if (!hasDeviceRecord && !isTrusted) {
          // TODO: [PRE-PROD] Re-enable Device Trust Prompt
          // showDeviceTrustPrompt(deviceId);
        }
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // Session Conflict - Realtime Listener
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('session-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newProfile = payload.new as any;
          const currentDeviceId = getDeviceId();
          console.log('AuthContext: Realtime update received. New Active Device:', newProfile.active_device_id, 'Local:', currentDeviceId);

          if (newProfile.active_device_id && newProfile.active_device_id !== currentDeviceId) {
            console.warn('Active session changed to another device. Signing out.');
            // Show a toast or alert? Maybe just sign out mostly.
            // We could set a "signed out due to other session" flag to show a message on login screen.
            await signOut();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [user]);

  const handleSessionReplace = async () => {
    if (!user) return;
    try {
      const currentDeviceId = getDeviceId();
      const { error } = await supabase
        .from('user_profiles')
        .update({ active_device_id: currentDeviceId })
        .eq('user_id', user.id);

      if (error) throw error;
      setSessionConflict(false);

      // Update local profile state
      setUserProfile((prev: any) => ({ ...prev, active_device_id: currentDeviceId }));
    } catch (error) {
      console.error('Error updating active session:', error);
      alert('Failed to switch session. Please try again.');
    }
  };

  const handleSessionCancel = async () => {
    await signOut();
    setSessionConflict(false);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` }
    });
    if (error) console.error('Error signing in with Google:', error);
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('AuthContext: Profile fetch error:', error);
        return null;
      }

      if (!data) {
        console.log('AuthContext: Profile not found, creating master profile');
        const newProfile = {
          user_id: userId,
          email: session?.user?.email || '',
          full_name: session?.user?.user_metadata?.full_name || 'User',
          currency: 'DKK',
          timezone: 'Europe/Copenhagen',
          role: 'user',
          is_setup_complete: true,
          onboarding_status: 'completed',
          active_device_id: getDeviceId()
        };
        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error('AuthContext: Profile creation error', createError);
          return null;
        }
        console.log('AuthContext: Created new profile with deviceId:', newProfile.active_device_id);
        return createdProfile;
      }

      // Check active session
      const currentDeviceId = getDeviceId();
      console.log('AuthContext: Checking session. Remote:', data.active_device_id, 'Local:', currentDeviceId);

      if (data.active_device_id && data.active_device_id !== currentDeviceId) {
        console.warn('Session conflict detected. Active on:', data.active_device_id);
        setSessionConflict(true);
      } else if (!data.active_device_id) {
        console.log('AuthContext: Claiming empty session for device:', currentDeviceId);
        // Claim session if none exists
        await supabase.from('user_profiles').update({ active_device_id: currentDeviceId }).eq('user_id', userId);
        data.active_device_id = currentDeviceId;
      }

      console.log('AuthContext: Profile fetched successfully:', data.full_name);
      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setUserProfile(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
      setUser(null);
      setSession(null);
      setUserProfile(null);
      window.location.href = '/';
    }
  };

  const value = {
    user,
    session,
    userProfile, // Real profile logic restored
    loading,
    signInWithGoogle,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showDeviceTrustDialog && pendingDeviceId && (
        <DeviceTrustDialog
          deviceId={pendingDeviceId}
          onTrust={() => handleDeviceTrust()} // No callback needed for timer reset anymore, hook handles it
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
