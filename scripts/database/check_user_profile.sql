-- Check existing user profiles and auth users
-- Run this to see what users exist and their IDs

-- Check user_profiles table
SELECT '=== USER PROFILES ====' as info;
SELECT id, user_id, email, full_name, created_at FROM public.user_profiles;

-- Check auth.users table  
SELECT '=== AUTH USERS ====' as info;
SELECT id, email, created_at FROM auth.users;

-- Check if your specific user exists
SELECT '=== CHECKING SPECIFIC USER ====' as info;
SELECT 
    up.id as profile_id,
    up.user_id as auth_user_id,
    up.email,
    up.full_name,
    up.created_at as profile_created
FROM public.user_profiles up 
WHERE up.email = 'michaelmullally@gmail.com';

-- Also check auth.users for that email
SELECT 
    au.id as auth_id,
    au.email,
    au.created_at as auth_created
FROM auth.users au 
WHERE au.email = 'michaelmullally@gmail.com';
