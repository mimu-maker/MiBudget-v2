-- Check what was actually created in user_profiles
SELECT '=== CURRENT USER PROFILES ===' as status;
SELECT id, user_id, email, created_at FROM public.user_profiles 
ORDER BY created_at DESC;

-- Check what auth.users ID we should be using
SELECT '=== AUTH USERS FOR REFERENCE ===' as status;
SELECT id, email, created_at FROM auth.users 
WHERE email = 'michaelmullally@gmail.com';
