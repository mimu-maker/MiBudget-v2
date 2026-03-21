import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

const envConfig = dotenv.parse(fs.readFileSync('./.env'))
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY)

async function run() {
    const { data, error } = await supabase.from('transactions').select('id, merchant, clean_merchant').not('clean_merchant', 'is', null).limit(10)
    console.log("Error:", error)
    console.log("Transactions with clean_merchant:", data)
}
run()
