import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

const envConfig = dotenv.parse(fs.readFileSync('./.env'))
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY)

async function run() {
    const { data: session } = await supabase.auth.getSession()
    console.log("Has Session:", !!session?.session)

    const { data, error } = await supabase.from('source_rules').select('clean_source_name').limit(10)
    console.log("Error:", error)
    console.log("Source Rules:", data?.length)
}
run()
