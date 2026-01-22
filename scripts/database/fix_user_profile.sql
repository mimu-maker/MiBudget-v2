-- Fix: Create user profile if missing
-- Run this in Supabase SQL Editor

-- Create user profile linking auth user to user_profiles
INSERT INTO public.user_profiles (id, user_id, email, full_name, created_at, updated_at)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'a316d106-5bc5-447a-b594-91dab8814c06', 'michaelmullally@gmail.com', 'Michael Mullally', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify the profile was created
SELECT '=== USER PROFILE CREATED ===' as status;
SELECT id, user_id, email, full_name FROM public.user_profiles WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06';
