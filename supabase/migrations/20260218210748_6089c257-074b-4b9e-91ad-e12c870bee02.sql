
-- Create fasting tracker table
CREATE TABLE public.user_ramadan_fasting (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
  has_fasted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_number)
);

-- Enable RLS
ALTER TABLE public.user_ramadan_fasting ENABLE ROW LEVEL SECURITY;

-- Users can manage their own fasting data
CREATE POLICY "Users manage their own fasting data"
  ON public.user_ramadan_fasting
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all fasting data
CREATE POLICY "Admins can view all fasting data"
  ON public.user_ramadan_fasting
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Trigger for updated_at
CREATE TRIGGER update_user_ramadan_fasting_updated_at
  BEFORE UPDATE ON public.user_ramadan_fasting
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
