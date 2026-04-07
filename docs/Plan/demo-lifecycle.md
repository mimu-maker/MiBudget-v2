# Demo Lifecycle Management

## Goal

The demo account (`demo@example.com`) is a shared, public sandbox. It needs to be automatically reset so one user's changes don't pollute the next. Two triggers:

1. **Inactivity timeout** — 15 minutes of no interaction → reset + sign out
2. **Explicit sign-out** — when the demo user clicks "Sign Out" → reset first, then sign out

---

## Backend (already exists — do not modify)

`reset_demo_account()` is a Postgres function in the DB:

```sql
-- Already deployed. Deletes all demo data, then re-seeds from demo_seed_* snapshot tables.
-- Only callable by demo@example.com (raises EXCEPTION otherwise).
SELECT reset_demo_account(); -- called via supabase.rpc('reset_demo_account')
```

Call it as: `await supabase.rpc('reset_demo_account')`

---

## Frontend Changes

### 1. Detect demo user

The demo user has `userProfile.email === 'demo@example.com'`. Check this wherever needed:

```typescript
const isDemoUser = userProfile?.email === 'demo@example.com';
```

### 2. New hook: `src/hooks/useDemoLifecycle.ts`

Create this hook. It should:
- Only activate when `isDemoUser === true`
- Reset and sign out after 15 minutes of inactivity
- Track inactivity via `mousemove`, `keydown`, `click`, `scroll` events on `window`
- Clean up event listeners and timers on unmount

```typescript
// Pseudocode — implement properly with useEffect/useCallback/useRef
export const useDemoLifecycle = () => {
  const { userProfile, signOut } = useAuth();
  const isDemoUser = userProfile?.email === 'demo@example.com';
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAndSignOut = async () => {
    try {
      await supabase.rpc('reset_demo_account');
    } catch (e) {
      console.warn('Demo reset failed (non-blocking):', e);
    }
    await signOut();
  };

  const resetTimer = useCallback(() => {
    if (!isDemoUser) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(resetAndSignOut, 15 * 60 * 1000); // 15 min
  }, [isDemoUser]);

  useEffect(() => {
    if (!isDemoUser) return;
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start on mount
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDemoUser, resetTimer]);
};
```

### 3. Mount the hook

Add `useDemoLifecycle()` to `src/App.tsx` (or the top-level authenticated layout component), so it runs whenever a user is signed in:

```tsx
// In App.tsx, inside the authenticated section:
useDemoLifecycle();
```

### 4. Demo-aware sign-out

In `src/contexts/AuthContext.tsx`, modify `signOut` to reset the demo account first if the current user is the demo user:

```typescript
const signOut = async () => {
  try {
    // Reset demo data before signing out
    const currentEmail = userProfile?.email;
    if (currentEmail === 'demo@example.com') {
      try {
        await supabase.rpc('reset_demo_account');
      } catch (e) {
        console.warn('Demo reset on sign-out failed (non-blocking):', e);
      }
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    updateProfileAndAccount(null);
    window.location.href = '/';
  } catch (error) {
    console.error('Sign out failed:', error);
  }
};
```

> **Important**: The reset must be non-blocking — if it fails, sign out should still proceed. Wrap in try/catch as shown.

---

## Auth Context Pattern (do not break this)

`src/contexts/AuthContext.tsx` uses `userProfile` state which is set by `fetchUserProfile`. The demo user's profile is:

```json
{
  "email": "demo@example.com",
  "current_account_id": "00000000-0000-4000-a000-000000000001"
}
```

The `signOut` function currently does:
```typescript
await supabase.auth.signOut();
setUser(null);
setSession(null);
updateProfileAndAccount(null);
window.location.href = '/';
```

Add the demo reset **before** `supabase.auth.signOut()`.

---

## UX Considerations

- **No modal/warning before auto-logout** — the demo is public, silent reset is fine
- **After reset**: the next demo user starts with fresh seed data automatically
- The 15-minute timer resets on ANY user activity, so active users won't be kicked

---

## Validation Checklist (for Claude to verify)

- [ ] `useDemoLifecycle` only activates for `demo@example.com`, no-ops for real users
- [ ] After 15 min idle on demo account: app redirects to login, demo data is fresh on next login
- [ ] Clicking Sign Out on demo account: reset fires, then redirects to login
- [ ] Real user sign-out is unchanged (no reset call)
- [ ] Timer properly cleared on component unmount (no memory leaks)
- [ ] `npm run build` clean — no TypeScript errors
