# Auth Model

## Overview

MiBudget uses a **"Single Account, Multi-User"** design. Multiple Supabase Auth users (Michael + Tanja, plus the demo user) share data through a `user_profiles` table that holds a `current_account_id`. All data tables are scoped to `account_id`, not to the individual auth UID.

---

## Identity Chain

```
auth.uid()                         ← Supabase Auth UUID (per device/login)
    ↓
user_profiles.user_id = auth.uid() ← profile row (one per auth user)
    ↓
user_profiles.current_account_id   ← the shared account UUID
    ↓
accounts.id                        ← all data is scoped here
```

**Never query data directly with `auth.uid()`** in frontend code or RLS policies. Always resolve through `user_profiles`:

```typescript
// Frontend
const profileId = userProfile?.id || user?.id;  // user_profiles.id
const accountId = currentAccountId;              // user_profiles.current_account_id
```

```sql
-- In RLS policies
public.get_my_account_id()
-- expands to: SELECT current_account_id FROM user_profiles WHERE user_id = auth.uid()
```

---

## Accounts

| Account | ID | Users |
|---|---|---|
| Mullally household | `92325837-1cf0-4157-82c6-82a233389b1a` | Michael (`michaelmullally@gmail.com`), Tanja (`tanjen2@gmail.com`) |
| Demo | `00000000-0000-4000-a000-000000000001` | demo (`demo@example.com`) |

---

## User Profiles

Three rows in `user_profiles`:

| email | user_id (auth UID) | id (profile UUID) | current_account_id |
|---|---|---|---|
| michaelmullally@gmail.com | a316d106-... | d1ad5d65-... | 92325837-... |
| tanjen2@gmail.com | (Tanja's auth UID) | ed2aaf21-... | 92325837-... |
| demo@example.com | 00000000-...-0002 | 2edb305b-... | 00000000-...-0001 |

---

## RLS Pattern

Every data table uses this single policy:

```sql
CREATE POLICY "account members can access <table>"
ON public.<table>
FOR ALL
USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());
```

Tables with this policy: `transactions`, `budgets`, `categories`, `sub_categories`, `budget_category_limits`, `projections`, `merchant_rules`, `source_rules`.

`sub_categories` and `budget_category_limits` don't have their own `account_id` column — they join through their parent:

```sql
-- sub_categories RLS
USING (
  EXISTS (
    SELECT 1 FROM categories
    WHERE categories.id = sub_categories.category_id
    AND categories.account_id = public.get_my_account_id()
  )
)
```

---

## Auth Modes

### Production (Google OAuth)
- Sign in via `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Only allowed emails configured in `src/lib/authUtils.ts` (`isEmailAllowed`, `getMasterEmail`)
- Profile created on first sign-in if not present

### Demo
- Sign in via `supabase.auth.signInWithPassword({ email: 'demo@example.com', password: 'demo123' })`
- Email provider must be enabled in Supabase dashboard
- Data resets on sign-out and after 15 min inactivity (see `docs/Plan/demo-lifecycle.md`)
- Demo auth user is a real Supabase Auth user, not a mock

### Local dev bypass
- Set `VITE_DEV_BYPASS_AUTH=true`
- Skips all auth, uses `{ id: 'dev-user', email: 'dev@example.com' }` mock
- `LocalAuthContext` handles CRUD operations locally

---

## UnifiedAuthContext

`src/contexts/UnifiedAuthContext.tsx` is the single interface for all components. It picks between Supabase auth and local auth based on `localStorage.getItem('authMode') === 'local'`.

```typescript
import { useAuth } from '@/contexts/UnifiedAuthContext';

const { user, userProfile, currentAccountId, signOut, signInWithGoogle, signInWithDemo } = useAuth();
```

Key fields:
- `user.id` — Supabase Auth UID (do not use for DB queries)
- `userProfile.id` — `user_profiles.id` UUID (use for foreign keys where needed)
- `currentAccountId` — use for ALL data table queries and inserts

---

## Session Security

- **Single active session**: `user_profiles.last_session_id` tracks the active session. A new login overwrites it, triggering a `SessionConflictDialog` on the other tab/device.
- **Session timer**: configurable inactivity timeout via `useSessionTimer`, signs out on expiry.
- **Device trust**: `useDeviceTrust` tracks trusted devices in localStorage; untrusted devices show `DeviceTrustDialog` on login.
