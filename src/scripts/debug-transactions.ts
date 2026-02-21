
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || (!supabaseKey && !serviceKey)) {
    console.error('Missing Supabase URL or Key in environment variables.');
    process.exit(1);
}

// Prefer service key for admin tasks, fallback to anon (might have RLS issues for broad queries)
const supabase = createClient(supabaseUrl, serviceKey || supabaseKey!);

async function main() {
    console.log('--- Transaction Debug Report ---');

    // 1. Count Total Transactions
    const { count: total, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting transactions:', countError);
        return;
    }
    console.log(`Total Transactions: ${total}`);

    // 2. Count Excluded Transactions
    const { count: excludedCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('excluded', true);
    console.log(`Excluded Transactions: ${excludedCount}`);

    // 3. Count by Source (Top 20)
    const { data: sources, error: sourceError } = await supabase
        .from('transactions')
        .select('source, clean_source, excluded, status');

    if (sourceError) {
        console.error('Error fetching sources:', sourceError);
        return;
    }

    const sourceCounts: Record<string, { total: number, excluded: number, active: number }> = {};
    sources?.forEach((t: any) => {
        const key = t.clean_source || t.source || 'Unknown';
        if (!sourceCounts[key]) sourceCounts[key] = { total: 0, excluded: 0, active: 0 };
        sourceCounts[key].total++;
        if (t.excluded) sourceCounts[key].excluded++;
        else sourceCounts[key].active++;
    });

    console.log('\nTop Sources:');
    Object.entries(sourceCounts)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 20)
        .forEach(([source, counts]) => {
            console.log(`- ${source}: ${counts.total} total (${counts.active} active, ${counts.excluded} excluded)`);
        });

    // 4. Check specifically for "Sunset"
    console.log('\nSearch for "Sunset":');
    const sunsetTxs = sources?.filter((t: any) =>
        (t.source && t.source.toLowerCase().includes('sunset')) ||
        (t.clean_source && t.clean_source.toLowerCase().includes('sunset'))
    );

    if (sunsetTxs.length === 0) {
        console.log('No transactions found matching "Sunset".');
    } else {
        sunsetTxs.forEach((t: any) => {
            console.log(`- ${t.source} (Clean: ${t.clean_source}) | Excluded: ${t.excluded} | Status: ${t.status}`);
        });
    }
}

main();
