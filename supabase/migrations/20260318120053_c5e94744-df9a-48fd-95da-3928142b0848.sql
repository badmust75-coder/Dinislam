-- 1. Fix app_logs: overly permissive INSERT WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.app_logs;
CREATE POLICY "Users can insert own logs" ON public.app_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Fix profiles: all PII readable by any authenticated user
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix student_ranking: users can overwrite their own ranking
DROP POLICY IF EXISTS "Users can manage own ranking" ON public.student_ranking;
CREATE POLICY "Users can insert own ranking" ON public.student_ranking
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own ranking" ON public.student_ranking
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage ranking" ON public.student_ranking
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix user_roles: any user can enumerate admin accounts
DROP POLICY IF EXISTS "authenticated_can_read_user_roles" ON public.user_roles;