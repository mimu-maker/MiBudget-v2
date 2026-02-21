# Email Restriction Setup for Google Auth

## Overview
This document explains how to configure email restrictions for Google OAuth authentication in MiBudget, limiting access to only you and your wife.

## Configuration Steps

### 1. Update Allowed Emails
Edit `/src/contexts/AuthContext.tsx` and update the `ALLOWED_EMAILS` array:

```typescript
const ALLOWED_EMAILS = [
  'your-email@example.com',  // Replace with your actual email
  'wife-email@example.com'   // Replace with wife's actual email
];
```

### 2. Current Implementation
The email restriction is implemented in two places:

#### Auth State Change Handler
```typescript
if (session?.user.app_metadata?.provider === 'google' && !isEmailAllowed(session.user.email || '')) {
  console.error('Email not allowed:', session.user.email);
  await supabase.auth.signOut();
  alert('Access denied. This email is not authorized to use this application.');
  return;
}
```

#### Initial Session Check
```typescript
if (session?.user.app_metadata?.provider === 'google' && !isEmailAllowed(session.user.email || '')) {
  console.error('Email not allowed:', session.user.email);
  await supabase.auth.signOut();
  return;
}
```

## How It Works

1. **Google OAuth Detection**: Checks if user signed in with Google (`app_metadata.provider === 'google'`)
2. **Email Validation**: Validates email against `ALLOWED_EMAILS` array
3. **Auto Sign-out**: Immediately signs out unauthorized users
4. **User Notification**: Shows alert message explaining access denial

## Security Features

- ✅ **Provider-Specific**: Only restricts Google OAuth, not other auth methods
- ✅ **Immediate Blocking**: Unauthorized users are signed out immediately
- ✅ **User Feedback**: Clear error message for unauthorized access
- ✅ **Session Validation**: Checks both initial session and auth state changes

## Testing

### Test with Allowed Email
1. Sign in with one of the allowed emails
2. Should successfully access the application

### Test with Blocked Email
1. Try to sign in with a different Google account
2. Should see "Access denied" message
3. Should be automatically signed out

## Deployment Notes

- Update `ALLOWED_EMAILS` before deploying to production
- Test with both allowed and blocked emails
- Ensure error message is user-friendly
- Consider adding logging for unauthorized access attempts

## Future Enhancements

- Add admin interface to manage allowed emails
- Implement email domain restrictions (e.g., `@yourdomain.com`)
- Add temporary access codes for guests
- Create audit log for access attempts
