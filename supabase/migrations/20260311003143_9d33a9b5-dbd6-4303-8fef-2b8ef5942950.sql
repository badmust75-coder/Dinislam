
-- Add prayer_name and is_checked to user_daily_prayers if they don't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_daily_prayers') THEN
    ALTER TABLE public.user_daily_prayers ADD COLUMN IF NOT EXISTS prayer_name text;
    ALTER TABLE public.user_daily_prayers ADD COLUMN IF NOT EXISTS is_checked boolean DEFAULT false;
  ELSE
    CREATE TABLE public.user_daily_prayers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      date text NOT NULL,
      prayer_name text NOT NULL,
      is_checked boolean DEFAULT false,
      created_at timestamp with time zone DEFAULT now()
    );
    ALTER TABLE public.user_daily_prayers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage own prayers" ON public.user_daily_prayers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Change notification_prompt_dismissed from boolean to text if it's boolean
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' 
    AND column_name = 'notification_prompt_dismissed' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN notification_prompt_dismissed TYPE text USING CASE WHEN notification_prompt_dismissed THEN 'accepted' ELSE NULL END;
  END IF;
END $$;

-- Add user_sourate_progress table if missing
CREATE TABLE IF NOT EXISTS public.user_sourate_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sourate_id uuid NOT NULL,
  is_validated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, sourate_id)
);
ALTER TABLE public.user_sourate_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sourate_progress' AND policyname = 'Users can manage own sourate progress') THEN
    CREATE POLICY "Users can manage own sourate progress" ON public.user_sourate_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add user_nourania_progress table if missing
CREATE TABLE IF NOT EXISTS public.user_nourania_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  is_validated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE public.user_nourania_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_nourania_progress' AND policyname = 'Users can manage own nourania progress') THEN
    CREATE POLICY "Users can manage own nourania progress" ON public.user_nourania_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add user_invocation_progress table if missing
CREATE TABLE IF NOT EXISTS public.user_invocation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invocation_id integer NOT NULL,
  is_memorized boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, invocation_id)
);
ALTER TABLE public.user_invocation_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_invocation_progress' AND policyname = 'Users can manage own invocation progress') THEN
    CREATE POLICY "Users can manage own invocation progress" ON public.user_invocation_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add user_alphabet_progress table if missing
CREATE TABLE IF NOT EXISTS public.user_alphabet_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  letter_id integer NOT NULL,
  is_validated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, letter_id)
);
ALTER TABLE public.user_alphabet_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_alphabet_progress' AND policyname = 'Users can manage own alphabet progress') THEN
    CREATE POLICY "Users can manage own alphabet progress" ON public.user_alphabet_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add student_ranking table if missing
CREATE TABLE IF NOT EXISTS public.student_ranking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.student_ranking ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_ranking' AND policyname = 'Anyone can view ranking') THEN
    CREATE POLICY "Anyone can view ranking" ON public.student_ranking FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_ranking' AND policyname = 'Users can manage own ranking') THEN
    CREATE POLICY "Users can manage own ranking" ON public.student_ranking FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
