-- Delete attendant profile
DELETE FROM public.attendant_profiles WHERE user_id = '2bded48a-849c-4585-be32-114a9401a263';

-- Delete user roles
DELETE FROM public.user_roles WHERE user_id = '2bded48a-849c-4585-be32-114a9401a263';

-- Delete user profile
DELETE FROM public.user_profiles WHERE user_id = '2bded48a-849c-4585-be32-114a9401a263';

-- Delete auth user
DELETE FROM auth.users WHERE id = '2bded48a-849c-4585-be32-114a9401a263';