/**
 * MiBudget App Reset Script
 * 
 * Complete app reset - clear all localStorage, sessionStorage, and session data
 * Use this when experiencing auth issues, spinning screens, or device trust problems
 * 
 * Usage:
 * 1. Open Developer Tools (F12 or Cmd+Option+I)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Wait for automatic page refresh
 */

console.log('🔄 Resetting MiBudget app...');

// Clear ALL localStorage entries
localStorage.clear();
console.log('✅ LocalStorage cleared');

// Clear sessionStorage entries
sessionStorage.clear();
console.log('✅ SessionStorage cleared');

// Force sign out from Supabase
if (window.supabase) {
  window.supabase.auth.signOut().then(() => {
    console.log('✅ Supabase session cleared');
  });
}

// Clear any cookies (for good measure)
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
console.log('✅ Cookies cleared');

console.log('🎯 App reset complete! Refreshing in 2 seconds...');
setTimeout(() => {
  window.location.reload();
}, 2000);

/**
 * What this script does:
 * - Clears all localStorage (device trust, auth mode, preferences)
 * - Clears all sessionStorage (temporary data)
 * - Signs out from Supabase (invalidates session tokens)
 * - Clears all cookies (complete cleanup)
 * - Auto-refreshes the page
 * 
 * When to use:
 * - Spinning loading screens
 * - Authentication stuck
 * - Device trust issues
 * - Want to test fresh login
 * - Switching between users
 */
