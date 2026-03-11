
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_prompt_later_at timestamp with time zone;

-- Create user_ramadan_fasting if not exists
CREATE TABLE IF NOT EXISTS public.user_ramadan_fasting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_number integer NOT NULL,
  has_fasted boolean DEFAULT false,
  is_fasting boolean DEFAULT false,
  date text NOT NULL DEFAULT '',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, day_number)
);
ALTER TABLE public.user_ramadan_fasting ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_ramadan_fasting' AND policyname = 'Users can manage own fasting') THEN
    CREATE POLICY "Users can manage own fasting" ON public.user_ramadan_fasting FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create user_ramadan_video_watched if not exists
CREATE TABLE IF NOT EXISTS public.user_ramadan_video_watched (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_id uuid NOT NULL,
  video_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, video_id)
);
ALTER TABLE public.user_ramadan_video_watched ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_ramadan_video_watched' AND policyname = 'Users can manage own watched') THEN
    CREATE POLICY "Users can manage own watched" ON public.user_ramadan_video_watched FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create user_ramadan_progress if not exists
CREATE TABLE IF NOT EXISTS public.user_ramadan_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_id uuid NOT NULL,
  quiz_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, day_id)
);
ALTER TABLE public.user_ramadan_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_ramadan_progress' AND policyname = 'Users can manage own progress') THEN
    CREATE POLICY "Users can manage own progress" ON public.user_ramadan_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_ramadan_progress' AND policyname = 'Admins can view all progress') THEN
    CREATE POLICY "Admins can view all progress" ON public.user_ramadan_progress FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
