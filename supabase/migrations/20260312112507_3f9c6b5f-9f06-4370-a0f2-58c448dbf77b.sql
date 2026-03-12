ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';

DROP POLICY IF EXISTS admin_can_update_profiles ON public.profiles;
CREATE POLICY admin_can_update_profiles
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));