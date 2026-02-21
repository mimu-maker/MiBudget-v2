// Complete app reset - clear all localStorage and session data
// Run this in browser console: copy/paste content and press Enter

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
