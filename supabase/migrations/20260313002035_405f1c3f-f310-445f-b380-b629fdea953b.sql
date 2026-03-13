INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'nadiaelb341@outlook.com'
ON CONFLICT (user_id, role) DO NOTHING;