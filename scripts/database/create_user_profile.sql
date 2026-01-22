-- Create User Profile for Annual Budget Import
-- Run this first to create your user profile, then run the budget import

-- Step 1: Create user profile (using the ID that was actually created)
INSERT INTO public.user_profiles (user_id, email, full_name, currency, timezone, role, is_setup_complete)
VALUES 
    ('d1ad5d65-da01-445f-bcfe-cc7f6552a424', 'michaelmullally@gmail.com', 'Michael Mullally', 'NOK', 'Europe/Oslo', 'admin', TRUE)
ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW()
RETURNING id as profile_id;

-- Step 2: Verify user profile creation
SELECT 'User profile created successfully' as status;
SELECT id, email, full_name, created_at FROM public.user_profiles 
WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06';

-- IMPORTANT: Replace 'your-email@example.com' and 'Your Name' with your actual email and name
-- After running this, you can then run the budget import script
