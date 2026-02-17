
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://irudwhbkkdbhufjtofog.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWR3aGJra2RiaHVmanRvZm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Mjg5NzQsImV4cCI6MjA4NDMwNDk3NH0.F_HZyKq_otxZW1mBi0UZnJunFJY_0np2BrIdQA4tp2k";

// Try to use global fetch if available
if (!global.fetch) {
    console.warn("Global fetch not found. Might crash.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Debug Budget Data (Groceries 2025) ---');

    const targetCategory = 'Food';
    const targetSubCategory = 'Groceries';
    const targetYear = 2025;

    // 1. Fetch raw transactions
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('category', targetCategory)
        .eq('sub_category', targetSubCategory)
        .eq('budget_year', targetYear)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return;
    }

    if (!transactions || transactions.length === 0) {
        console.log('No transactions found.');
        return;
    }

    console.log(`Found ${transactions.length} transactions.`);

    // 2. Calculate Stats
    let sumTotal = 0;
    let sumNegative = 0;
    let sumPositive = 0;

    // Also check distinct currencies if relevant, though assuming single currency for now

    transactions.forEach((t: any) => {
        const amt = Number(t.amount);
        if (isNaN(amt)) return;

        sumTotal += amt;
        if (amt < 0) sumNegative += amt;
        else sumPositive += amt;
    });

    console.log(`\nStatistics:`);
    console.log(`Sum Total (Net): ${sumTotal.toFixed(2)}`);
    console.log(`Sum Negative (Expenses): ${sumNegative.toFixed(2)}`);
    console.log(`Sum Positive (Refunds/Income): ${sumPositive.toFixed(2)}`);

    console.log(`\nPotential "Spent" Values:`);
    console.log(`Old Logic (|Sum Negatives|): ${Math.abs(sumNegative).toFixed(2)}`);
    console.log(`New Logic (Net * -1): ${(sumTotal * -1).toFixed(2)}`);

    // 3. Dump first 10 transactions
    console.log(`\nSample Transactions (First 10):`);
    transactions.slice(0, 10).forEach((t: any) => {
        console.log(`${t.date} | ${String(t.description || t.source).substring(0, 30).padEnd(30)} | ${t.amount} | Month: ${t.budget_month}`);
    });
}

main();
