# Plan: Move Currency to Account Level

## Problem

`currency` currently lives on `user_profiles` (per-user). Since two users (Michael + Tanja) share one account, they could theoretically have different currencies — but in practice the whole account operates in one currency. It should be an account-level setting.

## Current State

- `user_profiles.currency` — set per user (e.g. 'DKK' for Mullally, 'USD' for demo)
- `useSettings` hook reads from `user_settings` table, falls back to 'DKK'
- `useSettings` has a demo override: `isDemo ? { ...rawSettings, currency: 'USD' } : rawSettings`
- `ProfileContext` defaults to 'DKK'
- 47 files reference `settings.currency` (via `useSettings`) — these don't need changes if we update the source

## Target State

- `accounts.currency` — single currency per account
- `useSettings` reads currency from account instead of user_settings/user_profiles
- Demo account currency = 'USD', Mullally = 'DKK' (unchanged behaviour)

## Migration Steps

### 1. DB Migration

```sql
-- Add currency to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'DKK';

-- Seed from user_profiles (take the currency from the account owner)
UPDATE accounts a
SET currency = (
  SELECT up.currency FROM user_profiles up
  WHERE up.current_account_id = a.id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.current_account_id = a.id
);
```

Verify:
```sql
SELECT id, currency FROM accounts;
-- Mullally → DKK, Demo → USD
```

### 2. Frontend: `src/hooks/useSettings.ts`

Read currency from account instead of user_settings:

```typescript
// Current (wrong source)
currency: rawSettings?.currency ?? 'DKK'

// Target: pull from userProfile.account.currency or a new useAccount() hook
// Simplest: add currency to the accounts query already in UnifiedAuthContext
```

Check how `currentAccountId` / account data is loaded in `UnifiedAuthContext` — if accounts are already fetched, just expose `account.currency`.

### 3. Frontend: `src/contexts/ProfileContext.tsx`

Remove `currency` default from profile context (it should come from account, not profile).

### 4. Frontend: `src/contexts/UnifiedAuthContext.tsx`

Add `currency` to the context value, sourced from the accounts table:

```typescript
// Fetch account row alongside userProfile
const { data: account } = await supabase.from('accounts').select('currency').eq('id', currentAccountId).single();
// Expose as: currency: account?.currency ?? 'DKK'
```

### 5. Remove demo override in `useSettings`

Once currency comes from the account, the hardcoded demo override in `useSettings` can be removed:
```typescript
// Remove this line:
const settings = isDemo ? { ...rawSettings, currency: 'USD' } : rawSettings;
```

### 6. Settings UI: `src/components/Settings/GeneralSettings.tsx`

Change the currency selector to save to `accounts.currency` instead of `user_profiles.currency`.

## Files to Change

| File | Change |
|---|---|
| `supabase/migrations/` | Add `currency` to `accounts`, seed from `user_profiles` |
| `src/contexts/UnifiedAuthContext.tsx` | Fetch + expose `account.currency` |
| `src/hooks/useSettings.ts` | Read currency from account context, remove demo override |
| `src/contexts/ProfileContext.tsx` | Remove currency default |
| `src/components/Settings/GeneralSettings.tsx` | Save currency to `accounts` not `user_profiles` |

All other files use `settings.currency` via `useSettings` — no changes needed there.

## Validation Checklist

- [ ] `accounts.currency` = 'DKK' for Mullally, 'USD' for demo
- [ ] Currency displays correctly on Overview/Budget/Transactions for both accounts
- [ ] Changing currency in Settings updates `accounts.currency`
- [ ] Demo hardcode in `useSettings` removed
- [ ] `npm run build` clean
