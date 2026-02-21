import { describe, it, expect, vi } from 'vitest';
import { validateStoredAuth } from '@/lib/authUtils';

describe('validateStoredAuth', () => {
    it('returns false if no cookie is present', () => {
        // Mock document.cookie
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: '',
        });
        expect(validateStoredAuth()).toBe(false);
    });

    it('returns true if a valid token cookie is present', () => {
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: 'sb-access-token=mock-token',
        });
        expect(validateStoredAuth()).toBe(true);
    });

    it('returns true if any supabase token cookie is present', () => {
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: 'sb-auth-token=mock-token',
        });
        expect(validateStoredAuth()).toBe(true);
    });
});
