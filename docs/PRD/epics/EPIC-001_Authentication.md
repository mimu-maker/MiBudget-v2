# EPIC-001: Authentication & Shared Access

## 🎯 Objective
Establish a secure, frictionless authentication flow that enables two specific users (Michael & Tanja) to access a shared household budget while maintaining session security across different devices.

## ❗ Problem Statement
The application requires a way to distinguish between the two primary users while ensuring they both interact with the same underlying data (Master Account). Additionally, sessions must be protected against unauthorized device access while remaining convenient for regular use.

## ✅ Success Criteria
- [x] **Secure Sign-in**: Only allow emails in the `ALLOWED_EMAILS` list.
- [x] **Master Account Mapping**: Both Michael and Tanja's Google logins map to the same `user_profile` (Master Account).
- [x] **Device Trust**: "Don't ask again for 45 days" functionality works on trusted devices.
- [x] **Inactivity Timeout**: Untrusted devices time out after 15 minutes of inactivity.
- [x] **Session Persistence**: Users remain logged in across page refreshes until the session expires.
- [x] **User Identity**: Sidebar displays the correct name/avatar for the logged-in person (Michael or Tanja).

## 📋 Requirements & Technical Details
- **Google OAuth 2.0**: Integrated via Supabase Auth.
- **Email Allowlist**: Hardcoded `ALLOWED_EMAILS` in `authUtils.ts` to restrict access.
- **Master Profile mapping**: Logic in `AuthContext` to ensure all actions use the shared household profile ID regardless of which of the two users is logged in.
- **Device Fingerprinting**: LocalStorage-based fingerprinting used to identify "Trusted Devices".
- **Dynamic Session Security**: 
  - Trusted: 45-day persistence.
  - Untrusted: 15-minute inactivity auto-logout.
- **Auth Guard**: Middleware/Context check to enforce access on all protected routes.

## 🛠️ Implementation Status
**Status**: `Complete - Pending Review`

### User Stories
#### Story: AUTH-001 - Complete Authentication Flow Testing
**User Story:** As a user, I want to sign in seamlessly with Google OAuth and access my budget data, so that I can manage my finances without authentication issues.
**Status:** 🟡 `Pending Final Validation`
**Acceptance Criteria:**
- [ ] Google OAuth login works for both allowed emails.
- [ ] User profile creation succeeds on first login.
- [ ] Device trust prompts appear for new devices.
- [ ] Session timeouts work correctly (45 days trusted, 15 minutes untrusted).
- [ ] No authentication redirect loops.

### Proof of Work
- [AuthContext.tsx](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/contexts/AuthContext.tsx) - Handles Google Sign-in and Master Account mapping.
- [authUtils.ts](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/lib/authUtils.ts) - Contains the `ALLOWED_EMAILS` list.
- [useDeviceTrust.ts](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/hooks/useDeviceTrust.ts) - Manages device fingerprinting and trust TTL.
