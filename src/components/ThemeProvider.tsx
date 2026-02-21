
import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const { settings } = useSettings();

    useEffect(() => {
        const root = window.document.documentElement;
        if (settings.darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [settings.darkMode]);

    return <>{children}</>;
};
