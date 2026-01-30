# Device Trust & Session Security Policy

This document outlines the security measures implemented in MiBudget regarding device trust and session management.

## Session Durations

MiBudget uses two levels of device trust, each with specific session characteristics:

### 1. This login only (Untrusted)
- **Purpose**: For use on shared or public computers.
- **Duration**: 15 minutes of inactivity.
- **Behavior**: The session is automatically invalidated if no activity (mouse movement, key presses, clicks, etc.) is detected for 15 minutes.
- **Recommendation**: Always use this option when accessing MiBudget from a device you do not own.

### 2. Trust this device (Trusted)
- **Purpose**: For use on personal, password-protected computers.
- **Duration**: 45 days.
- **Behavior**: The session remains active for 45 days, allowing for persistent access without frequent re-login.
- **Recommendation**: Only select this for personal devices that are not accessible by others.

## Inactivity Timeout Implementation

The 15-minute inactivity timeout for "This login only" sessions is enforced via the following global event listeners:
- `mousedown`
- `mousemove`
- `keydown`
- `scroll`
- `touchstart`
- `click`

Every time one of these events is detected, the 15-minute timer is reset. If the timer expires, the user is automatically signed out from Supabase and redirected to the login page.

## Best Practices Adhered To

- **Session Isolation**: Each device generates a unique `device_id` stored in `localStorage`.
- **Explicit Consent**: New devices always prompt the user to choose their trust level.
- **Secure Sign-out**: Both manual sign-out and automatic timeout perform a full Supabase session invalidation and clear all local auth state.
