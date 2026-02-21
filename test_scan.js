
const { createClient } = require('@supabase/supabase-js');

// These would need to be provided or I can just mock the logic with the data I already have
const transactions = [
    { merchant: "OVERFØRSEL", status: "Pending Triage", category: "Other" },
    { merchant: "LØNOVERFØRSEL", status: "Pending Triage", category: "Income" },
    // ...
];

const cleanMerchant = (merchant) => {
    if (!merchant) return "";
    let cleaned = merchant.split('*')[0].split('  ')[0].trim();
    cleaned = cleaned.replace(/^(PAYPAL \*|SUMUP \*|IZ \*|GOOGLE \*)/i, '');
    cleaned = cleaned.replace(/[\s#]+\d+$/g, '').trim();
    cleaned = cleaned.replace(/\.(com|co\.uk|dk|net|org)$/i, '');
    return cleaned.trim();
};

const handleScan = (txs) => {
    const merchantData = {};
    txs.forEach(tx => {
        const clean = cleanMerchant(tx.merchant);
        if (!clean || tx.status === 'Complete') return;
        if (!merchantData[clean]) {
            merchantData[clean] = { count: 0 };
        }
        merchantData[clean].count++;
    });
    return Object.keys(merchantData);
};

console.log(handleScan(transactions));
