
-- Add admin policy to manage all profiles (approve, etc.)
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
