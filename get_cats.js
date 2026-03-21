const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://irudwhbkkdbhufjtofog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWR3aGJra2RiaHVmanRvZm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Mjg5NzQsImV4cCI6MjA4NDMwNDk3NH0.F_HZyKq_otxZW1mBi0UZnJunFJY_0np2BrIdQA4tp2k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, category_group, display_order, icon, sub_categories(id, name, display_order)')
    .eq('user_id', '00000000-0000-0000-0000-000000000002')
    .order('display_order');
  
  if (error) {
    console.error("Error:", error);
    process.exit(1);
  }

  // Look for budget data
  const { data: bData } = await supabase.from('budgets').select('id, year, budget_type').eq('user_id', '00000000-0000-0000-0000-000000000002');
  console.log("BUDGETS:", bData);

  let limits = [];
  if (bData && bData.length > 0) {
     const { data: hData } = await supabase.rpc('get_hierarchical_categories', { p_budget_id: bData[0].id });
     limits = hData || [];
  }
  
  console.log(JSON.stringify({ categories: data, limits }, null, 2));
}

main();
