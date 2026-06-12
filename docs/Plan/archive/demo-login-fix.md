# Plan: Fix Demo Login (Invalid Credentials)

## Problem

Demo login fails with "invalid credentials" in both prod and local. The `user_profiles` row for `demo@example.com` exists, but a matching Supabase **Auth** user must also exist with a known password — and this cannot be created via SQL migration alone.

## Root Cause

Supabase Auth users live in the `auth.users` table, which is managed by the Auth service. You cannot insert into `auth.users` with a hardcoded UUID via a standard migration. The demo auth user either:
- Was never created in the current project, or
- Was created manually and the password is unknown

## Current Demo Profile

| Field | Value |
|---|---|
| `user_profiles.email` | `demo@example.com` |
| `user_profiles.user_id` | `00000000-0000-0000-0000-000000000002` |
| `user_profiles.current_account_id` | `00000000-0000-4000-a000-000000000001` |

## Fix Options

### Option A — Supabase Dashboard (manual, no code)

1. Go to Supabase dashboard → **Authentication → Users**
2. Check if `demo@example.com` exists. If not, click **Invite user** or **Add user**.
3. Set email `demo@example.com`, password `demo1234` (or whatever you want to show on the login page)
4. Note the UUID Supabase assigns — it will NOT be `00000000-0000-0000-0000-000000000002`
5. Run this SQL to update `user_profiles` to match the real auth UID:
   ```sql
   UPDATE user_profiles
   SET user_id = '<new-auth-uuid-from-dashboard>'
   WHERE email = 'demo@example.com';
   ```
6. Update the login page to show the correct demo credentials

### Option B — Supabase Admin API (scriptable)

Use the Supabase Management API to create the user programmatically so it can be scripted for future resets:

```bash
curl -X POST 'https://api.supabase.com/v1/projects/irudwhbkkdbhufjtofog/auth/users' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json' \
  -d '{"email": "demo@example.com", "password": "demo1234", "email_confirm": true}'
```

Then update `user_profiles.user_id` to the returned UUID.

### Option C — Seed via `auth.users` insert (local only)

For local Supabase only, you can insert directly into `auth.users`. Not applicable to prod.

## Recommended Approach

**Option A** for immediate fix. **Option B** for scripting the demo reset flow long-term.

## Frontend: Show Demo Credentials on Login Page

Once the auth user is confirmed, add demo credentials to the login UI so users can try it without asking:

Find `src/pages/Auth.tsx` (or equivalent login page) and add a "Try Demo" button or credentials hint:

```tsx
<p className="text-sm text-muted-foreground text-center">
  Try the demo: <strong>demo@example.com</strong> / <strong>demo1234</strong>
</p>
```

## Validation

- [ ] `demo@example.com` appears in Supabase Auth → Users
- [ ] Login with demo credentials succeeds in prod
- [ ] Demo user sees seeded demo data (not Mullally data)
- [ ] `reset_demo_account()` can be called by demo user to reseed

## Related

- `docs/Plan/demo-lifecycle.md` — full demo account lifecycle wiring
- `docs/Plan/migration-file-sync.md` — demo bootstrap SQL sync
