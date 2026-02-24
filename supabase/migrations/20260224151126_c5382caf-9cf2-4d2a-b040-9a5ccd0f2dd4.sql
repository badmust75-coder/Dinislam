
-- Add last_seen column to profiles for presence tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
