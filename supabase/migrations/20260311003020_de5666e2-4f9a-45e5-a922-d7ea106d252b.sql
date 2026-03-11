
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_prompt_later_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_groups') THEN
    CREATE TABLE public.student_groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      color text DEFAULT '#3B82F6',
      created_at timestamp with time zone DEFAULT now()
    );
    ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins can manage student_groups" ON public.student_groups FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
    CREATE POLICY "Anyone can view student_groups" ON public.student_groups FOR SELECT TO authenticated USING (true);
  ELSE
    ALTER TABLE public.student_groups ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6';
  END IF;
END $$;

ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
