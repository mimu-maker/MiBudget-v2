-- Test direct query to bypass any potential issues
-- Run this in Supabase SQL Editor

-- Test 1: Check if we can query the profile directly
SELECT '=== DIRECT PROFILE QUERY ===' as status;
SELECT * FROM public.user_profiles WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06';

-- Test 2: Check if we can query with auth.uid()
SELECT '=== AUTH.UID() QUERY ===' as status;
SELECT auth.uid() as current_auth_user;

-- Test 3: Check if RLS is enabled
SELECT '=== RLS STATUS ===' as status;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Test 4: Temporarily disable RLS for testing
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Test 5: Query with RLS disabled
SELECT '=== QUERY WITH RLS DISABLED ===' as status;
SELECT * FROM public.user_profiles WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06';

-- Re-enable RLS after testing
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
