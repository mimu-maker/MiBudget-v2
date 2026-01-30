# Frontend Architecture - MiBudget

## Overview
MiBudget follows a "Single Account, Multi-Ready" architecture. This means the system is designed for a single shared household account today, but the database and frontend are structured to transition to multi-account/multi-tenant with minimal friction.

## Key Concepts

### 1. User Profiles vs. Auth Users
- **Auth User**: Managed by Supabase Auth (the person logged in).
- **User Profile**: A record in the `user_profiles` table that stores preferences, settings, and acts as the "Account ID" for financial data.
- **Shared Access**: Multiple Auth Users (e.g., Michael & Tanja) can map to the same User Profile ID. All financial data (transactions, budgets, categories) is linked to this Profile ID.

### 2. Unified Auth Context
The `UnifiedAuthContext` provides a consistent interface for accessing the current user and their shared profile. 
- Always use `useAuth().userProfile.id` when querying financial data from Supabase.
- Do not use `auth.uid()` directly in frontend queries if the goal is shared access.

### 3. RLS Policies (Security)
To support shared access, Row Level Security (RLS) policies must handle the indirection between the Auth UID and the Profile ID.

**Correct Multi-Ready Policy Pattern:**
```sql
CREATE POLICY "Users can manage own data" ON <table_name>
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = <table_name>.user_id
    AND (user_profiles.user_id = auth.uid() OR user_profiles.email = auth.jwt()->>'email')
  )
);
```

## Best Practices

### Local Fallback Mode
Components like `UnifiedCategoryManager` should support a "Local Fallback" mode for development or when Supabase is unreachable. This ensures the app remains interactive even without a backend.
- Check `hasSupabaseCategories` to switch between `dbCategories` and `settings.categories`.
- Implemented robust `handleAddSubInline` logic that works in both modes.

### Hierarchy & Naming
- Categories and Sub-categories are linked via `category_id`.
- Transactions store the *names* of categories/sub-categories for resilience/flexibility (though this requires careful renaming logic).

## Troubleshooting "Missing Data"
If categories or sub-categories are missing in the UI:
1. **Check RLS**: Ensure the policy correctly joins through `user_profiles`.
2. **Check Profile ID**: Verify the `user_id` in the data table matches the `id` in `user_profiles`.
3. **Check Budget IDs**: Many queries are scoped to a specific `budgetId`. Ensure a default budget exists for the profile.
