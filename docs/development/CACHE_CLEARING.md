# Cache Clearing Instructions

## 🔄 **Clear Browser Cache and Data**

### Chrome/Edge
1. **Open Dev Tools**: F12 or Ctrl+Shift+I
2. **Application Tab**: Click "Application" tab
3. **Local Storage**: Expand → Local Storage → your site
4. **Clear All**: Right-click → Clear
5. **Session Storage**: Expand → Session Storage → your site  
6. **Clear All**: Right-click → Clear
7. **Cookies**: Expand → Cookies → your site
8. **Clear All**: Right-click → Clear
9. **Refresh**: Ctrl+Shift+R (hard refresh)

### Firefox
1. **Open Dev Tools**: F12 or Ctrl+Shift+I
2. **Storage Tab**: Click "Storage" tab
3. **Local Storage**: Expand → your site
4. **Clear All**: Right-click → Clear
5. **Session Storage**: Expand → your site
6. **Clear All**: Right-click → Clear
7. **Cookies**: Expand → your site
8. **Clear All**: Right-click → Clear
9. **Refresh**: Ctrl+Shift+R (hard refresh)

### Safari
1. **Preferences**: Safari → Preferences
2. **Privacy**: Click "Privacy" tab
3. **Manage Website Data**: Click "Manage Website Data"
4. **Find Site**: Search for your app domain
5. **Remove**: Select and click "Remove"
6. **Refresh**: Cmd+Shift+R (hard refresh)

## 🗑️ **Quick Console Method**

Open browser console (F12) and run:

```javascript
// Clear all app-related storage
localStorage.clear();
sessionStorage.clear();

// Clear cookies (for current domain)
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Hard refresh
location.reload(true);
```

## 🎯 **What This Fixes**

- **Stuck UserSetup**: Clears cached profile state
- **Device Trust Issues**: Removes cached device data
- **Authentication Loop**: Clears session conflicts
- **Old Configuration**: Removes outdated settings

## ⚡ **After Clearing**

1. **Go to App**: Navigate to your MiBudget app
2. **Sign In**: Click "Sign in with Google"
3. **Select Account**: Choose Michael or Tanja's account
4. **Should Work**: Direct access to dashboard, no setup screens

## 🔧 **If Still Issues**

Run the SQL script in Supabase:
`/docs/setup/database/ensure_master_profile.sql`

This ensures the master profile exists with correct settings.

---

**Result**: Fresh start, no cached data blocking login!
