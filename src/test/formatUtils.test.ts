import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/lib/formatUtils';

describe('formatCurrency', () => {
    it('formats DKK by default with US format and kr suffix', () => {
        expect(formatCurrency(100)).toBe('100.00 kr');
        expect(formatCurrency(1234.56)).toBe('1,234.56 kr');
    });

    it('formats different currencies with US format and currency suffix', () => {
        expect(formatCurrency(100, 'USD')).toBe('100.00 USD');
        expect(formatCurrency(1234.56, 'EUR')).toBe('1,234.56 EUR');
    });

    it('handles zero correctly', () => {
        expect(formatCurrency(0)).toBe('0.00 kr');
    });
});
