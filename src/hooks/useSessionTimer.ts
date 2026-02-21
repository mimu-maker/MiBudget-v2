import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

export const useSessionTimer = (
    session: Session | null,
    isDeviceTrusted: boolean,
    signOut: () => Promise<void>
) => {
    useEffect(() => {
        if (!session?.user) return;

        let timeoutId: NodeJS.Timeout;

        const setupTimeout = () => {
            // TODO: [PRE-PROD] Restore trust-based timeout logic
            // const duration = isDeviceTrusted
            //     ? 24 * 24 * 60 * 60 * 1000 // 24 days
            //     : 15 * 60 * 1000;          // 15 minutes

            const duration = 24 * 24 * 60 * 60 * 1000; // Force 24 days for now

            if (timeoutId) clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                console.log('Session expired due to inactivity');
                signOut();
            }, duration);
        };

        const handleActivity = () => {
            // Only reset timeout for untrusted devices to save performance
            // Trusted devices have such long timeouts that micro-resets aren't needed
            if (!isDeviceTrusted) {
                setupTimeout();
            }
        };

        // Initial setup
        setupTimeout();

        // Activity listeners
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [session, isDeviceTrusted, signOut]);
};
