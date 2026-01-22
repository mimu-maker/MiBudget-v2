import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface LocalUserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  currency: string;
  timezone: string;
  role: 'admin' | 'editor' | 'viewer';
  is_setup_complete: boolean;
  created_at: string;
  updated_at: string;
  date_format?: string;
  number_format?: string;
  onboarding_step?: number;
  import_completed?: boolean;
}

interface LocalAuthContextType {
  user: LocalUser | null;
  userProfile: LocalUserProfile | null;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
  updateUserProfile: (profile: Partial<LocalUserProfile>) => Promise<void>;
  isLocalAuth: boolean;
}

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(undefined);

// Mock user database (in real app, this would be in localStorage or a backend)
const mockUsers: LocalUserProfile[] = [
  {
    id: '1',
    user_id: 'local-user-1',
    email: 'test@example.com',
    full_name: 'Test User',
    currency: 'USD',
    timezone: 'UTC',
    role: 'admin',
    is_setup_complete: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    date_format: 'MM/DD/YYYY',
    number_format: '1,234.56',
    onboarding_step: 0,
    import_completed: false
  },
  {
    id: '2',
    user_id: 'local-user-2',
    email: 'demo@example.com',
    full_name: 'Demo User',
    currency: 'USD',
    timezone: 'UTC',
    role: 'editor',
    is_setup_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    date_format: 'DD/MM/YYYY',
    number_format: '1.234,56',
    onboarding_step: 7,
    import_completed: true
  }
];

const mockPasswords: Record<string, string> = {
  'test@example.com': 'password123',
  'demo@example.com': 'demo123'
};

export const LocalAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem('localUser');
    const savedProfile = localStorage.getItem('localUserProfile');
    
    if (savedUser && savedProfile) {
      setUser(JSON.parse(savedUser));
      setUserProfile(JSON.parse(savedProfile));
    }
    
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const passwordMatch = mockPasswords[email];
      if (!passwordMatch || passwordMatch !== password) {
        throw new Error('Invalid email or password');
      }
      
      const profile = mockUsers.find(u => u.email === email);
      if (!profile) {
        throw new Error('User not found');
      }
      
      const localUser: LocalUser = {
        id: profile.user_id,
        email: profile.email,
        name: profile.full_name,
        role: profile.role
      };
      
      setUser(localUser);
      setUserProfile(profile);
      
      // Save to localStorage
      localStorage.setItem('localUser', JSON.stringify(localUser));
      localStorage.setItem('localUserProfile', JSON.stringify(profile));
      
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const existingUser = mockUsers.find(u => u.email === email);
      if (existingUser) {
        throw new Error('User already exists');
      }
      
      const newProfile: LocalUserProfile = {
        id: Date.now().toString(),
        user_id: `local-user-${Date.now()}`,
        email,
        full_name: name,
        currency: 'USD',
        timezone: 'UTC',
        role: 'editor',
        is_setup_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_format: 'MM/DD/YYYY',
        number_format: '1,234.56',
        onboarding_step: 0,
        import_completed: false
      };
      
      mockUsers.push(newProfile);
      mockPasswords[email] = password;
      
      const localUser: LocalUser = {
        id: newProfile.user_id,
        email: newProfile.email,
        name: newProfile.full_name,
        role: newProfile.role
      };
      
      setUser(localUser);
      setUserProfile(newProfile);
      
      localStorage.setItem('localUser', JSON.stringify(localUser));
      localStorage.setItem('localUserProfile', JSON.stringify(newProfile));
      
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    setUserProfile(null);
    localStorage.removeItem('localUser');
    localStorage.removeItem('localUserProfile');
  };

  const updateUserProfile = async (updates: Partial<LocalUserProfile>) => {
    if (!userProfile) return;
    
    const updatedProfile = { ...userProfile, ...updates, updated_at: new Date().toISOString() };
    
    // Update in mock database
    const index = mockUsers.findIndex(u => u.id === userProfile.id);
    if (index !== -1) {
      mockUsers[index] = updatedProfile;
    }
    
    setUserProfile(updatedProfile);
    localStorage.setItem('localUserProfile', JSON.stringify(updatedProfile));
  };

  const value: LocalAuthContextType = {
    user,
    userProfile,
    session: user ? { user } : null,
    loading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
    isLocalAuth: true
  };

  return (
    <LocalAuthContext.Provider value={value}>
      {children}
    </LocalAuthContext.Provider>
  );
};

export const useLocalAuth = (): LocalAuthContextType => {
  const context = useContext(LocalAuthContext);
  if (context === undefined) {
    throw new Error('useLocalAuth must be used within a LocalAuthProvider');
  }
  return context;
};
