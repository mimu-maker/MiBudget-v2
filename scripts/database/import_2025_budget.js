// 2025 Budget Data Import Script
// Based on the budget data from the user's image

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey);

// 2025 Budget Data from the image
const budgetData2025 = {
  year: 2025,
  budget_name: 'Primary 2025',
  budget_type: 'primary',
  categories: [
    {
      name: 'Auto & Transport',
      sub_categories: [
        { name: 'Gas & Fuel', limit: 200 },
        { name: 'Parking', limit: 50 },
        { name: 'Tesla', limit: 600 }
      ]
    },
    {
      name: 'Bills & Utilities',
      sub_categories: [
        { name: 'Electricity', limit: 150 },
        { name: 'Gas & Water', limit: 100 },
        { name: 'Internet', limit: 80 },
        { name: 'Phone', limit: 50 },
        { name: 'Trash', limit: 40 }
      ]
    },
    {
      name: 'Business Expenses',
      sub_categories: [
        { name: 'Advertising', limit: 100 },
        { name: 'Software', limit: 50 }
      ]
    },
    {
      name: 'Education',
      sub_categories: [
        { name: 'Student Loans', limit: 500 },
        { name: 'Tuition', limit: 1000 }
      ]
    },
    {
      name: 'Entertainment',
      sub_categories: [
        { name: 'Amusement', limit: 100 },
        { name: 'Events', limit: 50 },
        { name: 'Media', limit: 25 }
      ]
    },
    {
      name: 'Fees & Charges',
      sub_categories: [
        { name: 'Bank Fees', limit: 10 },
        { name: 'Service Fees', limit: 5 }
      ]
    },
    {
      name: 'Financial',
      sub_categories: [
        { name: 'Credit Card Payment', limit: 2000 },
        { name: 'Investment', limit: 500 },
        { name: 'Loan', limit: 1000 }
      ]
    },
    {
      name: 'Food & Dining',
      sub_categories: [
        { name: 'Fast Food', limit: 200 },
        { name: 'Groceries', limit: 600 },
        { name: 'Restaurants', limit: 300 }
      ]
    },
    {
      name: 'Gifts & Donations',
      sub_categories: [
        { name: 'Charity', limit: 100 },
        { name: 'Gifts', limit: 50 }
      ]
    },
    {
      name: 'Health & Fitness',
      sub_categories: [
        { name: 'Dental', limit: 50 },
        { name: 'Doctor', limit: 100 },
        { name: 'Gym', limit: 40 },
        { name: 'Pharmacy', limit: 25 }
      ]
    },
    {
      name: 'Home',
      sub_categories: [
        { name: 'Home Improvement', limit: 200 },
        { name: 'Home Services', limit: 100 },
        { name: 'Rent', limit: 2000 },
        { name: 'Supplies', limit: 50 }
      ]
    },
    {
      name: 'Income',
      sub_categories: [
        { name: 'Bonus', limit: 0 },
        { name: 'Paycheck', limit: 0 },
        { name: 'Reimbursement', limit: 0 }
      ]
    },
    {
      name: 'Insurance',
      sub_categories: [
        { name: 'Auto', limit: 150 },
        { name: 'Health', limit: 200 },
        { name: 'Life', limit: 50 },
        { name: 'Renters', limit: 30 }
      ]
    },
    {
      name: 'Personal Care',
      sub_categories: [
        { name: 'Clothing', limit: 100 },
        { name: 'Hair', limit: 30 },
        { name: 'Supplies', limit: 25 }
      ]
    },
    {
      name: 'Pets',
      sub_categories: [
        { name: 'Pet Food & Supplies', limit: 50 },
        { name: 'Veterinary', limit: 100 }
      ]
    },
    {
      name: 'Shopping',
      sub_categories: [
        { name: 'Amazon', limit: 200 },
        { name: 'Department Stores', limit: 100 },
        { name: 'Electronics', limit: 150 },
        { name: 'Sporting Goods', limit: 50 }
      ]
    },
    {
      name: 'Taxes',
      sub_categories: [
        { name: 'Federal Tax', limit: 500 },
        { name: 'State Tax', limit: 200 },
        { name: 'Property Tax', limit: 300 }
      ]
    },
    {
      name: 'Travel',
      sub_categories: [
        { name: 'Flights', limit: 300 },
        { name: 'Hotels', limit: 200 },
        { name: 'Vacation', limit: 500 }
      ]
    },
    {
      name: 'Uncategorized',
      sub_categories: [
        { name: 'Uncategorized', limit: 0 }
      ]
    }
  ]
};

async function import2025Budget() {
  try {
    console.log('Starting 2025 budget import...');
    
    // Get the user profile (assuming we're importing for a specific user)
    // You'll need to specify which user this budget belongs to
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return;
    }
    
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    
    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      console.error('Profile error:', profileError);
      return;
    }
    
    console.log('Importing budget for user:', userProfile.id);
    
    // Create or get the 2025 budget
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .upsert({
        user_id: userProfile.id,
        name: budgetData2025.budget_name,
        year: budgetData2025.year,
        budget_type: budgetData2025.budget_type,
        start_date: `${budgetData2025.year}-01-01`,
        is_active: true
      })
      .select()
      .single();
    
    if (budgetError) {
      console.error('Budget creation error:', budgetError);
      return;
    }
    
    console.log('Budget created/updated:', budget);
    
    // Process categories and sub-categories
    for (const categoryData of budgetData2025.categories) {
      // Create or get category
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .upsert({
          user_id: userProfile.id,
          name: categoryData.name,
          is_system: false
        })
        .select()
        .single();
      
      if (categoryError) {
        console.error('Category creation error:', categoryError);
        continue;
      }
      
      console.log('Category created/updated:', category);
      
      // Process sub-categories
      for (const subCategoryData of categoryData.sub_categories) {
        // Create or get sub-category
        const { data: subCategory, error: subCategoryError } = await supabase
          .from('sub_categories')
          .upsert({
            category_id: category.id,
            name: subCategoryData.name
          })
          .select()
          .single();
        
        if (subCategoryError) {
          console.error('Sub-category creation error:', subCategoryError);
          continue;
        }
        
        // Create budget category limit
        const { error: limitError } = await supabase
          .from('budget_category_limits')
          .upsert({
            budget_id: budget.id,
            category_id: category.id,
            limit_amount: subCategoryData.limit,
            alert_threshold: 80.0
          });
        
        if (limitError) {
          console.error('Budget limit creation error:', limitError);
          continue;
        }
        
        // Create budget sub-category entry (active by default)
        const { error: budgetSubCategoryError } = await supabase
          .from('budget_sub_categories')
          .upsert({
            budget_id: budget.id,
            sub_category_id: subCategory.id,
            is_active: true
          });
        
        if (budgetSubCategoryError) {
          console.error('Budget sub-category creation error:', budgetSubCategoryError);
          continue;
        }
        
        console.log(`  Sub-category created: ${subCategoryData.name} (limit: $${subCategoryData.limit})`);
      }
    }
    
    console.log('2025 budget import completed successfully!');
    
    // Verify the import
    const { data: verification, error: verificationError } = await supabase
      .from('budget_category_limits')
      .select(`
        limit_amount,
        categories(name),
        budgets(name, year)
      `)
      .eq('budget_id', budget.id);
    
    if (verificationError) {
      console.error('Verification error:', verificationError);
    } else {
      console.log(`Verification: ${verification.length} category limits imported for budget ${budget.name} (${budget.year})`);
    }
    
  } catch (error) {
    console.error('Import failed:', error);
  }
}

// Run the import
import2025Budget();
