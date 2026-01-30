import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MASTER_ACCOUNT_EMAIL } from '@/lib/authUtils';

export interface UserProfile {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    currency: string;
    timezone: string;
    language: 'en-US' | 'da-DK';
    date_format: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'YY/MM/DD';
    amount_format: 'comma_decimal' | 'dot_decimal';
    role: 'admin' | 'editor' | 'viewer' | 'restrict';
    is_setup_complete: boolean;
    onboarding_status: 'not_started' | 'profile_setup' | 'preferences_configured' | 'categories_added' | 'first_transaction' | 'completed';
    created_at: string;
    updated_at: string;
}

interface ProfileContextType {
    userProfile: UserProfile | null;
    loading: boolean;
    updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
    refreshUserProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, session } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const actualUserId = userData.user?.id || userId;

            const { data, error } = await (supabase as any)
                .from('user_profiles')
                .select('*')
                .eq('user_id', actualUserId)
                .single();

            if (error && error.code === 'PGRST116') {
                console.log('ProfileContext: Profile not found, creating master profile');
                const newProfile = {
                    user_id: actualUserId,
                    email: MASTER_ACCOUNT_EMAIL,
                    full_name: session?.user?.email === 'michaelmullally@gmail.com' ? 'Michael Mullally' :
                        session?.user?.email === 'tanjen2@gmail.com' ? 'Tanja Jensen' : 'Unknown User',
                    currency: 'DKK',
                    timezone: 'Europe/Copenhagen',
                    language: 'en-US',
                    date_format: 'YY/MM/DD',
                    amount_format: 'dot_decimal',
                    role: 'admin',
                    is_setup_complete: true,
                    onboarding_status: 'completed'
                };

                const { data: createdProfile, error: createError } = await (supabase as any)
                    .from('user_profiles')
                    .insert(newProfile)
                    .select()
                    .single();

                if (createError) {
                    console.error('ProfileContext: Profile creation failed:', createError);
                    return null;
                }
                return createdProfile as UserProfile;
            }
            return data as UserProfile;
        } catch (error) {
            console.error('Error in fetchUserProfile:', error);
            return null;
        }
    };

    const refreshUserProfile = async () => {
        if (!user) return;
        setLoading(true);
        const profile = await fetchUserProfile(user.id);
        setUserProfile(profile);
        setLoading(false);
    };

    const updateUserProfile = async (profileUpdate: Partial<UserProfile>) => {
        if (!user) throw new Error('No authenticated user');

        const updateData = {
            ...profileUpdate,
            updated_at: new Date().toISOString()
        };

        const { data: userData } = await supabase.auth.getUser();
        const actualUserId = userData.user?.id;

        const { data, error } = await (supabase as any)
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', actualUserId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        setUserProfile(data as UserProfile);
    };

    useEffect(() => {
        if (user) {
            refreshUserProfile();
        } else {
            setUserProfile(null);
            setLoading(false);
        }
    }, [user]);

    // Handle Dev Mode Mocking
    useEffect(() => {
        if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true' && !userProfile) {
            setUserProfile({
                id: 'dev-profile',
                user_id: 'dev-user',
                email: 'dev@example.com',
                full_name: 'Dev User',
                currency: 'DKK',
                timezone: 'Europe/Copenhagen',
                language: 'en-US',
                date_format: 'YY/MM/DD',
                amount_format: 'dot_decimal',
                role: 'admin',
                is_setup_complete: true,
                onboarding_status: 'completed',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            setLoading(false);
        }
    }, [user, userProfile]);

    return (
        <ProfileContext.Provider value={{ userProfile, loading, updateUserProfile, refreshUserProfile }}>
            {children}
        </ProfileContext.Provider>
    );
};
