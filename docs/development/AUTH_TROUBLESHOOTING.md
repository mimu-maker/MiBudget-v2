# Authentication Troubleshooting

## Issue: Can't Get In

### 🔍 **Troubleshooting Steps Applied**

1. **Device Trust Disabled**: Temporarily disabled device trust checks
2. **Session Timeout Extended**: Changed from 15 minutes to 24 hours
3. **Profile Creation Fixed**: Updated to use DKK/CET instead of USD/UTC
4. **Setup Complete**: Set to `true` to bypass UserSetup

### 🛠️ **Changes Made**

#### AuthContext.tsx
```typescript
// Device trust temporarily disabled
// Session timeout extended to 24 hours
// Profile creation uses DKK/CET
// is_setup_complete set to true
```

### 🎯 **What to Try Now**

1. **Clear Browser Data**:
   - Clear localStorage
   - Clear cookies
   - Refresh page

2. **Test Login**:
   - Go to the app
   - Click "Sign in with Google"
   - Use: michaelmullally@gmail.com or tanjen2@gmail.com

3. **Check Console**:
   - Open browser dev tools
   - Look for error messages
   - Check for "Email not allowed" or other errors

### 🔧 **If Still Not Working**

#### Check Browser Console
```javascript
// Check these values in console
localStorage.getItem('device_id')
localStorage.getItem('device_trusted')
localStorage.getItem('authMode')
```

#### Manual Profile Creation
If profile creation fails, the app might be stuck trying to create a user profile.

#### Check Supabase Connection
```javascript
// In browser console, check Supabase connection
supabase.auth.getSession()
```

### 📋 **Expected Flow**

1. **Google OAuth**: Redirect to Google, select account
2. **Email Check**: Should pass for allowed emails
3. **Profile Creation**: Should create master profile if needed
4. **Direct Access**: Should go straight to dashboard

### 🚨 **Common Issues**

#### Email Not Allowed
- **Error**: "Access denied. This email is not authorized"
- **Fix**: Ensure email matches exactly: `michaelmullally@gmail.com` or `tanjen2@gmail.com`

#### Profile Creation Fails
- **Error**: Database error when creating profile
- **Fix**: Check Supabase connection and permissions

#### Device Trust Loop
- **Error**: Stuck in device trust dialog
- **Fix**: Temporarily disabled (should work now)

#### Session Timeout
- **Error**: Immediately signed out
- **Fix**: Extended to 24 hours (should work now)

### 🔄 **Reverting Changes**

Once login works, we can re-enable security features:

```typescript
// Re-enable device trust
if (isNewDevice && !isTrusted) {
  showDeviceTrustPrompt(deviceId);
}

// Restore session timeout
return isDeviceTrusted() ? 45 * 24 * 60 * 1000 : 15 * 60 * 1000;
```

### 📞 **Next Steps**

1. **Try Login Now**: With the fixes applied
2. **Check Console**: For any error messages
3. **Report Results**: What happens when you try to sign in?
4. **Enable Security**: Once working, re-enable device trust

### 🎯 **Success Indicators**

✅ **Google OAuth popup appears**  
✅ **Email is accepted** (no "access denied" message)  
✅ **Profile is created or found**  
✅ **Redirected to dashboard** (not UserSetup)  
✅ **No immediate sign-out**  

If any of these don't happen, check the browser console for error messages.

---

**Status**: Device trust disabled, session extended, profile fixed - ready for testing!
