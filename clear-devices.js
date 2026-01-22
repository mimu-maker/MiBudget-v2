// Clear all device trust records from localStorage
// Run this in browser console: copy/paste the content and press Enter

console.log('🧹 Clearing device trust records...');

// Clear device trust entries
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('device_trusted_') || key === 'device_trusted' || key === 'device_id') {
    console.log(`Removing: ${key}`);
    localStorage.removeItem(key);
  }
});

// Clear auth mode to reset
localStorage.removeItem('authMode');

console.log('✅ Device trust records cleared. Refresh to see the device trust dialog again.');
