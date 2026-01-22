-- Ensure Master Profile Exists
-- This script creates the master profile for Michael and Tanja
-- Run this in Supabase SQL editor if login issues persist

-- First, delete any existing master profile to avoid conflicts
DELETE FROM public.user_profiles WHERE user_id = 'master-account-id';

-- Create the master profile with correct settings
INSERT INTO public.user_profiles (
    id,
    user_id,
    email,
    full_name,
    currency,
    timezone,
    role,
    is_setup_complete,
    onboarding_status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'master-account-id',
    'michaelmullally@gmail.com',
    'Michael Mullally',
    'DKK',
    'Europe/Copenhagen',
    'admin',
    true,
    'completed',
    now(),
    now()
);

-- Verify the profile was created
SELECT * FROM public.user_profiles WHERE user_id = 'master-account-id';

-- Note: This profile will be used for both Michael and Tanja
-- The name will be dynamically set based on the logged-in email
