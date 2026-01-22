-- Debug: Check user profile creation
-- Run this in Supabase SQL Editor

-- Test 1: Check auth.users
SELECT '=== AUTH USERS ===' as status;
SELECT id, email, created_at FROM auth.users WHERE email = 'michaelmullally@gmail.com';

-- Test 2: Check user_profiles
SELECT '=== USER PROFILES ===' as status;
SELECT id, user_id, email, full_name, created_at FROM public.user_profiles;

-- Test 3: Check if user profile exists for our auth user
SELECT '=== USER PROFILE LINK ===' as status;
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  up.id as profile_id,
  up.user_id as profile_user_id,
  up.email as profile_email
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.user_id = au.id
WHERE au.email = 'michaelmullally@gmail.com';

-- Test 4: Check budgets for user
SELECT '=== BUDGETS FOR USER ===' as status;
SELECT 
  b.id,
  b.name,
  b.year,
  b.user_id,
  up.email as user_email
FROM public.budgets b
JOIN public.user_profiles up ON up.id = b.user_id
WHERE up.user_id = (SELECT id FROM auth.users WHERE email = 'michaelmullally@gmail.com');
