
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { DeviceTrustDialog } from '@/components/Auth/DeviceTrustDialog';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  currency: string;
  timezone: string;
  role: 'admin' | 'editor' | 'viewer';
  is_setup_complete: boolean;
  onboarding_status: 'not_started' | 'profile_setup' | 'preferences_configured' | 'categories_added' | 'first_transaction' | 'completed';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showDeviceTrustDialog, setShowDeviceTrustDialog] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);

  // Clear existing timeout on component unmount
  useEffect(() => {
    return () => {
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, [sessionTimeout]);

  // Setup session timeout
  const setupSessionTimeout = () => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    const timeout = getSessionTimeout();
    console.log(`Setting session timeout: ${timeout}ms (${isDeviceTrusted() ? 'trusted device' : 'untrusted device'})`);
    
    const newTimeout = setTimeout(() => {
      console.log('Session expired due to inactivity');
      supabase.auth.signOut();
    }, timeout);
    
    setSessionTimeout(newTimeout);
  };

  // Device trust handlers
  const handleDeviceTrust = () => {
    if (pendingDeviceId) {
      setDeviceTrusted(true);
      localStorage.setItem(`device_trusted_${pendingDeviceId}`, 'true');
      console.log('Device marked as trusted:', pendingDeviceId);
      setShowDeviceTrustDialog(false);
      setPendingDeviceId(null);
      setupSessionTimeout(); // Reset timeout with new trust level
    }
  };

  const handleDeviceDontTrust = () => {
    if (pendingDeviceId) {
      setDeviceTrusted(false);
      localStorage.setItem(`device_trusted_${pendingDeviceId}`, 'false');
      console.log('Device marked as untrusted:', pendingDeviceId);
      setShowDeviceTrustDialog(false);
      setPendingDeviceId(null);
      setupSessionTimeout(); // Reset timeout with new trust level
    }
  };

  const showDeviceTrustPrompt = (deviceId: string) => {
    setPendingDeviceId(deviceId);
    setShowDeviceTrustDialog(true);
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      // For master account implementation, we always use the actual authenticated user ID
      // This ensures consistency between lookup and creation
      const { data: userData } = await supabase.auth.getUser();
      const actualUserId = userData.user?.id || userId;
      
      const { data, error } = await (supabase as any)
        .from('user_profiles')
        .select('*')
        .eq('user_id', actualUserId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist - create fresh master profile
        console.log('Creating fresh master profile for:', MASTER_ACCOUNT_EMAIL);
        
        const newProfile = {
          user_id: actualUserId, // Use actual authenticated user ID
          email: MASTER_ACCOUNT_EMAIL,
          full_name: session?.user?.email === 'michaelmullally@gmail.com' ? 'Michael Mullally' : 'Tanja Jensen',
          currency: 'DKK', // Fixed to DKK
          timezone: 'Europe/Copenhagen', // Fixed to CET
          role: 'admin',
          is_setup_complete: true, // Set to true for simplified setup
          onboarding_status: 'completed', // Set to completed
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: createdProfile, error: createError } = await (supabase as any)
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating master profile:', createError);
          return null;
        }
        
        return createdProfile as UserProfile;
      }

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    
    const profile = await fetchUserProfile(user.id);
    setUserProfile(profile);
  };

  const updateUserProfile = async (profile: Partial<UserProfile>) => {
    if (!user) throw new Error('No authenticated user');

    const updateData = {
      ...profile,
      is_setup_complete: true,
      updated_at: new Date().toISOString()
    };

    // Always update master account profile
    // Get actual authenticated user ID for consistency
    const { data: userData } = await supabase.auth.getUser();
    const actualUserId = userData.user?.id;
    
    const { data, error } = await (supabase as any)
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', actualUserId) // ✅ Use actual authenticated user ID
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    setUserProfile(data as UserProfile);
  };

  useEffect(() => {
    console.log("🧪 VITE_DEV_BYPASS_AUTH:", import.meta.env.VITE_DEV_BYPASS_AUTH);
    const bypass = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

    if (bypass) {
      console.warn('⚠️ Bypassing Supabase login (dev mode)');
      const mockUser = {
        id: 'dev-user',
        email: 'dev@example.com',
        role: 'authenticated',
      } as User;
      setUser(mockUser);
      setSession({} as Session);
      
      // Mock user profile for dev mode
      const mockProfile: UserProfile = {
        id: 'dev-profile',
        user_id: 'dev-user',
        email: 'dev@example.com',
        full_name: 'Dev User',
        currency: 'USD',
        timezone: 'UTC',
        role: 'admin',
        is_setup_complete: true,
        onboarding_status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setUserProfile(mockProfile);
      setLoading(false);
      return;
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check email restriction for Google auth
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
            showDeviceTrustPrompt(deviceId);
          } else {
            setupSessionTimeout();
          }
          
          // Always use master account profile for both emails
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);
        } else {
          setUserProfile(null);
          if (sessionTimeout) {
            clearTimeout(sessionTimeout);
            setSessionTimeout(null);
          }
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check email restriction for Google auth
        if (session.user.app_metadata?.provider === 'google' && !isEmailAllowed(session.user.email || '')) {
          console.error('Email not allowed:', session.user.email);
          await supabase.auth.signOut();
          return;
        }
        
        // Check device trust for existing sessions
        const deviceId = getDeviceId();
        const isTrusted = isDeviceTrusted();
        const hasDeviceRecord = localStorage.getItem(`device_trusted_${deviceId}`);
        
        if (!hasDeviceRecord && !isTrusted) {
          showDeviceTrustPrompt(deviceId);
        } else {
          setupSessionTimeout();
        }
        
        // Always use master account profile for both emails
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  // Email restriction for Google auth - both emails map to same account
  const ALLOWED_EMAILS = [
    'michaelmullally@gmail.com',  // Your email
    'tanjen2@gmail.com'            // Wife's email
  ];
  
  // Master account email for database storage
  const MASTER_ACCOUNT_EMAIL = 'michaelmullally@gmail.com';

  const isEmailAllowed = (email: string) => {
    return ALLOWED_EMAILS.includes(email);
  };
  
  const getMasterAccountId = () => {
    // Always use the same account ID for both emails
    return 'master-account-id';
  };

  // Device trust management
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  const isDeviceTrusted = () => {
    return localStorage.getItem('device_trusted') === 'true';
  };

  const setDeviceTrusted = (trusted: boolean) => {
    localStorage.setItem('device_trusted', trusted.toString());
  };

  const getSessionTimeout = () => {
    return isDeviceTrusted() ? 45 * 24 * 60 * 1000 : 15 * 60 * 1000; // 45 days vs 15 minutes
  };

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      
      // Clear session timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        setSessionTimeout(null);
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      
      console.log('Successfully signed out from Supabase');
      
      // Clear all state
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      console.log('Cleared all auth state');
      
      // Force page reload to ensure clean state
      window.location.href = '/';
      
    } catch (error) {
      console.error('Sign out failed:', error);
      // Still clear state even if sign out failed
      setUser(null);
      setSession(null);
      setUserProfile(null);
      window.location.href = '/';
    }
  };

  const value = {
    user,
    session,
    userProfile,
    loading,
    signInWithGoogle,
    signOut,
    updateUserProfile,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showDeviceTrustDialog && pendingDeviceId && (
        <DeviceTrustDialog
          deviceId={pendingDeviceId}
          onTrust={handleDeviceTrust}
          onDontTrust={handleDeviceDontTrust}
        />
      )}
    </AuthContext.Provider>
  );
};
