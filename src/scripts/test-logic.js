
// Mock of importBrain.ts logic

const cleanSource = (source, noiseFilters = []) => {
    if (!source) return "";

    // 1. Remove common statement separators
    let cleaned = source.split('*')[0].split('  ')[0].trim();

    // 2. Apply Custom Noise Filters (Anti-rules)
    noiseFilters.forEach(filter => {
        if (!filter) return;
        try {
            const escaped = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'gi');
            cleaned = cleaned.replace(regex, '').trim();
        } catch (e) {
            console.warn('Invalid noise filter pattern:', filter);
        }
    });

    // 3. Fallback Hardcoded Legacy Noise Prefixes
    cleaned = cleaned.replace(/^(PAYPAL \*|SUMUP \*|IZ \*|GOOGLE \*|BS |BS)/i, '');

    // 4. Remove trailing/leading digits
    cleaned = cleaned.replace(/^[#\s]*\d+[\s-]/, '').trim();
    cleaned = cleaned.replace(/[\s#-]+\d+$/, '').trim();
    cleaned = cleaned.replace(/\s+\d{4,}\s+/g, ' ').trim();

    // 5. Remove common noise
    cleaned = cleaned.replace(/\.(com|co\.uk|dk|net|org)$/i, '');

    return cleaned.trim();
};

const processTransaction = (
    rawSource,
    rawDate,
    rules,
    noiseFilters = [],
    sourceSettings = []
) => {
    const clean = cleanSource(rawSource, noiseFilters);
    const cleanLower = clean.toLowerCase();

    // 1. Try Exact Match
    let match = rules.find(rule =>
        (rule.source_name && rule.source_name.toLowerCase() === rawSource.toLowerCase()) ||
        (rule.clean_source_name && rule.clean_source_name.toLowerCase() === cleanLower)
    );
    let confidence = match ? 1.0 : 0.0;

    // 2. Try Prefix/Substring Match
    if (!match) {
        match = rules.find(rule => {
            const sourceNameRaw = rule.source_name || "";
            const cleanNameRaw = rule.clean_source_name || "";
            const ruleName = (sourceNameRaw || cleanNameRaw).toLowerCase().trim();

            if (!ruleName || ruleName.length < 2) return false;
            // Simulated: allow fuzzy
            if (rule.match_mode === 'exact') return false;

            return rawSource.toLowerCase().startsWith(ruleName) ||
                cleanLower.startsWith(ruleName) ||
                (cleanLower.length > 3 && ruleName.startsWith(cleanLower)) ||
                rawSource.toLowerCase().includes(ruleName);
        });
        if (match) confidence = 0.8;
    }

    const cleanName = match?.clean_source_name || clean;

    return {
        clean_source: cleanName,
        category: match?.auto_category || "",
        match_found: !!match,
        confidence,
        raw_source: rawSource,
        clean_calculated: clean
    };
};

// Data from DB
const rules = [
    {
        "id": "f450bd09-ce2a-4062-a03f-a83f2f81b2cf",
        "source_name": "TOPDANMARK",
        "clean_source_name": "TopDanmark Insurance",
        "match_mode": "fuzzy",
        "auto_category": "Transport"
    },
    {
        "id": "fd8a404f-d46a-41fd-880c-4e3f9e6be457",
        "source_name": "MC/VISA DK K BYENS BRØDHUS A",
        "clean_source_name": "Bakery - Byens Brodhus",
        "match_mode": "fuzzy",
        "auto_category": "Food",
        "auto_sub_category": "Takeaway"
    },
    {
        "id": "5906fe41-3a62-4a68-ad4d-f6719a318d81",
        "source_name": "BYENS BR@DHUS",
        "clean_source_name": "Bakery - Byens Brodhus",
        "match_mode": "fuzzy",
        "auto_category": "Food"
    }
];

const tdRaw = "BS TOPDANMARK - EN DEL AF IF FO";
const bbRaw = "MC/VISA DK K BYENS BRØDHUS A";

console.log("--- TEST 1: TopDanmark ---");
const r1 = processTransaction(tdRaw, "2024-01-01", rules);
console.log(JSON.stringify(r1, null, 2));

console.log("\n--- TEST 2: Byen Brodhus ---");
const r2 = processTransaction(bbRaw, "2024-01-01", rules);
console.log(JSON.stringify(r2, null, 2));
