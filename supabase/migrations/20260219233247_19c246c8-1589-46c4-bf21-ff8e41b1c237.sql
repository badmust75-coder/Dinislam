
-- Users update their own last_seen (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own last_seen'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own last_seen" ON public.profiles FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END
$$;
