
import { parseDate } from '../lib/importUtils';

describe('parseDate behavior', () => {
    it('should parse DD.MM.YY correctly and convert to YYYY-MM-DD', () => {
        // Given current year is 2026 (from metadata)
        // If user imports "26/02/04" or "04.02.26"
        // Let's see what happens with year 26
        const result = parseDate('04.02.26');
        console.log('Result for 04.02.26:', result);
        expect(result).toBe('2026-02-04');
    });

    it('should handle YY/MM/DD if it falls into the DMY match incorrectly', () => {
        // "26/02/04"
        // dmy regex: /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/
        // dmy[1] = 26 (Day?)
        // dmy[2] = 02 (Month?)
        // dmy[3] = 04 (Year? + 2000 = 2004)
        const result = parseDate('26/02/04');
        console.log('Result for 26/02/04:', result);
        // If it's Interpreted as 26th Feb 2004, it returns 2004-02-26
    });

    it('should handle 2025-03-03 DANMARK"', () => {
        // If the date string contains extra text, fallback might trigger or regex might fail
        const result = parseDate('2025-03-03 DANMARK"');
        console.log('Result for "2025-03-03 DANMARK"":', result);
    });
});
