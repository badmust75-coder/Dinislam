
-- Create connexion_logs table
CREATE TABLE public.connexion_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  connected_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.connexion_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own logs
CREATE POLICY "Users can insert own connexion logs"
  ON public.connexion_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own logs
CREATE POLICY "Users can read own connexion logs"
  ON public.connexion_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all logs
CREATE POLICY "Admins can read all connexion logs"
  ON public.connexion_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.connexion_logs;
