-- Link existing auth user to user_profiles table
-- This creates the missing link between your auth user and user_profiles

INSERT INTO public.user_profiles (user_id, email, full_name, currency, timezone, role, is_setup_complete)
VALUES 
    ('a316d106-5bc5-447a-b594-91dab8814c06', 'michaelmullally@gmail.com', 'Michael Mullally', 'NOK', 'Europe/Oslo', 'admin', TRUE)
ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW()
RETURNING id as profile_id;

-- Verify the link was created
SELECT 'User profile linked successfully' as status;
SELECT id, user_id, email, full_name FROM public.user_profiles 
WHERE user_id = 'a316d106-5bc5-447a-b594-91dab8814c06';
