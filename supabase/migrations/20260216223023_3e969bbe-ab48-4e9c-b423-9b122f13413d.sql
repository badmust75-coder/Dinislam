
-- Add started_at to ramadan_settings to track when admin pressed "Lancer"
ALTER TABLE public.ramadan_settings ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NULL;
