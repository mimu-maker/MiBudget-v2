import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://iomfdkkuvjtkfhlilkvi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbWZka2t1dmp0a2ZobGlsa3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTMzNzEsImV4cCI6MjA2NjY4OTM3MX0.RncLKvmig238fYXFSCBpa87dbqbrTQl8TNWu9OXbPuU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanup() {
    console.log('--- Starting Emergency Category Cleanup ---');

    // 1. Move 'Special' to 'special' group
    const { error: moveError } = await supabase
        .from('categories')
        .update({ category_group: 'special' })
        .eq('name', 'Special');

    if (moveError) console.error('Error moving Special:', moveError);
    else console.log('✓ Moved Special to special group');

    // 2. Nullify transactions with 'General'
    const { error: nullGeneralError, count: generalCount } = await supabase
        .from('transactions')
        .update({ category: null, sub_category: null, status: 'Pending Triage' })
        .eq('category', 'General');

    if (nullGeneralError) console.error('Error nulling General transactions:', nullGeneralError);
    else console.log(`✓ Nulled ${generalCount || 'some'} transactions with category 'General'`);

    // 3. Delete 'General' category
    const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('name', 'General');

    if (deleteError) console.error('Error deleting General category:', deleteError);
    else console.log('✓ Deleted General category');

    // 4. Nullify transactions with invalid categories (not in master list)
    const { data: validCats } = await supabase.from('categories').select('name');
    const catNames = validCats?.map(c => c.name) || [];

    if (catNames.length > 0) {
        const { error: orphanError } = await supabase
            .from('transactions')
            .update({ category: null, sub_category: null, status: 'Pending Triage' })
            .not('category', 'in', `(${catNames.join(',')})`)
            .not('category', 'is', null);

        if (orphanError) console.error('Error nulling orphan transactions:', orphanError);
        else console.log('✓ Nulled orphan transactions');
    }

    console.log('--- Cleanup Finished ---');
}

cleanup();
