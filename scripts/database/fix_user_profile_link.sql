-- Fix user profile linkage issue
-- Run this in Supabase SQL Editor

-- Check current profile linkage
SELECT '=== CURRENT PROFILE LINKAGE ===' as status;
SELECT 
  'Auth User ID: a316d106-5bc5-447a-b594-91dab8814c06' as auth_info,
  up.id as profile_id,
  up.user_id as profile_user_id,
  up.email as profile_email
FROM public.user_profiles up
WHERE up.id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424';

-- Fix the user profile linkage if wrong
UPDATE public.user_profiles 
SET user_id = 'a316d106-5bc5-447a-b594-91dab8814c06'
WHERE id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424'
AND user_id != 'a316d106-5bc5-447a-b594-91dab8814c06';

-- Verify the fix
SELECT '=== AFTER FIX ===' as status;
SELECT 
  up.id as profile_id,
  up.user_id as profile_user_id,
  up.email as profile_email
FROM public.user_profiles up
WHERE up.id = 'd1ad5d65-da01-445f-bcfe-cc7f6552a424';
