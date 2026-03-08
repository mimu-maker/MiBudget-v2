// node tmp_check_db.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

const envConfig = dotenv.parse(fs.readFileSync('./.env'))
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY)

async function run() {
    const { data, error } = await supabase.from('transactions').select('status, entity, updated_at', { count: 'exact' }).eq('status', 'Reconciled')
    console.log("Error:", error)
    console.log("Reconciled count:", data?.length)

    const { data: allComplete, error: err2 } = await supabase.from('transactions').select('status, entity, updated_at', { count: 'exact' }).eq('status', 'Complete')
    console.log("Complete count:", allComplete?.length)
}
run()
