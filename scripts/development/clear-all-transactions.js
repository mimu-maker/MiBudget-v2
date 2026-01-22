// Clear all transactions from Supabase and local storage
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://irudwhbkkdbhufjtofog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlbiI6ImFwaV9yZWFjdGlvbiIsImFwaV9yZWFjdGlvbl9zZXJ2aWNlIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3Mzc1ODU3MTcsImV4cCI6MTczNzE5MjMxN30.SflKyx0gHq3YqJ9GX7e0bQa8kL9o3Uq4h6mN2w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllTransactions() {
  try {
    console.log('🧹 Clearing all transactions from Supabase...');
    
    // Delete all transactions from Supabase
    const { error } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (hack since no .delete() without filter)
    
    if (error) {
      console.error('❌ Error deleting from Supabase:', error);
    } else {
      console.log('✅ All transactions deleted from Supabase');
    }
    
    // Clear local storage
    console.log('🧹 Clearing local storage...');
    localStorage.removeItem('mibudget_transactions');
    
    // Clear IndexedDB
    if (window.indexedDB) {
      const deleteRequest = indexedDB.deleteDatabase('mibudget_transactions_db');
      deleteRequest.onsuccess = () => console.log('✅ IndexedDB cleared');
      deleteRequest.onerror = () => console.error('❌ Error clearing IndexedDB');
    }
    
    console.log('✅ Local storage cleared');
    console.log('🎉 All transactions cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error during clear:', error);
  }
}

clearAllTransactions();
