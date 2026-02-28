import { useState, useEffect } from 'react';

/**
 * A hook that syncs a React state to sessionStorage to persist across tab swaps 
 * and unmounts within the same session.
 */
export function usePersistentState<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const [state, setState] = useState<T>(() => {
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading sessionStorage key "${key}":`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.sessionStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.warn(`Error setting sessionStorage key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState];
}
