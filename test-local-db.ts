import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('transactions').select('*').limit(1);
  console.log('Select anon:', { data, error });
  
  const { data: iData, error: iError } = await supabase.from('transactions').insert([{
    user_id: 'local-user-2',
    date: '2026-03-01',
    source: 'Test',
    merchant: 'Test',
    amount: 100,
    account: 'Test',
    status: 'Pending',
    planned: false,
    recurring: 'N/A',
    fingerprint: 'test-local-user-2-fg',
  }]).select();
  console.log('Insert anon:', { data: iData, error: iError });
}

test();
