// Mock of the implementation in src/lib/importUtils.ts
const parseAmount = (value: string, forceLocale: 'auto' | 'us' | 'eu' = 'auto'): number => {
    console.log(`Parsing Amount: "${value}" (Locale: ${forceLocale})`);
    if (!value) return 0;
    let clean = value.toString().trim();

    // FIX: Remove currency symbols but also handle trailing punctuation like '.' from 'kr.' 
    // First, aggressive generic cleanup
    clean = clean.replace(/[^\d.,-]/g, '');

    // FIX: Strip trailing dots or commas that might be left over from currency symbols (e.g. "kr." -> ".")
    clean = clean.replace(/[.,]+$/, '');

    if (!clean) return 0;

    if (forceLocale === 'eu') {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (forceLocale === 'us') {
        clean = clean.replace(/,/g, '');
    } else {
        // Auto-detect
        const lastComma = clean.lastIndexOf(',');
        const lastDot = clean.lastIndexOf('.');

        console.log(`  Cleaned: "${clean}", LastComma: ${lastComma}, LastDot: ${lastDot}`);

        if (lastComma > -1 && lastDot > -1) {
            if (lastComma > lastDot) {
                console.log(`  Detected EU/DKK (Dots=Thousands, Comma=Decimal).`);
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                console.log(`  Detected US (Comma=Thousands, Dot=Decimal).`);
                clean = clean.replace(/,/g, '');
            }
        } else if (lastComma > -1) {
            // Only Commas. Treat as Decimal if ambiguous (Danish style)
            console.log(`  Detected Comma-Only. Treating as Decimal (EU).`);
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else if (lastDot > -1) {
            // Only Dots. Treat as Thousands? Or Decimal?
            // If we have "1.000", is it 1000 (DKK) or 1 (US)?
            // Without explicit locale, this is hard. 
            // But if we stripped trailing dots, a remaining dot usually means decimal in US or thousand in EU.
            // Safest default in a Danish context is EU? But app is generic?
            // Let's check dot count.
            const dotCount = (clean.match(/\./g) || []).length;
            if (dotCount > 1) {
                // 1.000.000 -> Thousands
                clean = clean.replace(/\./g, '');
            } else {
                // 1.000 -> Ambiguous.
                // If user selected generic "Auto", assume US for single dot? 
                // Or better: rely on the explicit passed locale. 
                // For now, standard JS behavior is dot=decimal.
            }
        }
    }

    clean = clean.replace(/[^\d.-]/g, '');
    return parseFloat(clean) || 0;
};

const parseDate = (value: string): string => {
    console.log(`Parsing Date: "${value}"`);
    if (!value) return "FALLBACK_TODAY";

    const clean = value.trim();

    // ISO check failure?
    let date = new Date(clean);
    if (!isNaN(date.getTime()) && clean.includes('-') && clean.indexOf('-') === 4) {
        return date.toISOString();
    }

    // Parts check
    // Support 2-digit year: \d{2,4}
    const parts = clean.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (parts) {
        console.log(`  Matched Parts: Day=${parts[1]}, Month=${parts[2]}, Year=${parts[3]}`);
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1;
        let year = parseInt(parts[3], 10);

        if (year < 100) year += 2000; // Handle CA 2-digit years

        date = new Date(year, month, day, 12, 0, 0);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }

    return "FALLBACK_TODAY";
};

// Test Cases
console.log("--- TEST AMOUNTS ---");
console.log("Final: ", parseAmount("-3.126,38 kr.")); // Expected: -3126.38 (Auto EU)
console.log("Final: ", parseAmount("1.000,00"));     // Expected: 1000.00
console.log("Final: ", parseAmount("1.000,00", 'eu')); // Explicit EU
console.log("Final: ", parseAmount("1.000"));        // DKK 1000? Auto might fail, explicit EU should work.
console.log("Final: ", parseAmount("1.000", 'eu'));  // Expected: 1000
console.log("Final: ", parseAmount("1.000", 'us'));  // Expected: 1

console.log("\n--- TEST DATES ---");
console.log("Final: ", parseDate("13-01-2025"));
console.log("Final: ", parseDate("13.01.25"));       // 2-digit year dot
console.log("Final: ", parseDate("1/1/25"));         // 2-digit year slash
