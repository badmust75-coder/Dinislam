
-- Add notification_prompt_dismissed column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_prompt_dismissed text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_prompt_later_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_prompt_later_at timestamp with time zone DEFAULT NULL;

-- Create scheduled_notifications table
CREATE TABLE public.scheduled_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  send_time time NOT NULL DEFAULT '08:00:00',
  recipients jsonb NOT NULL DEFAULT '"all"',
  is_active boolean NOT NULL DEFAULT true,
  require_confirmation boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage scheduled_notifications" ON public.scheduled_notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create notification_confirmations table for read confirmations
CREATE TABLE public.notification_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES public.scheduled_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  confirmed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

ALTER TABLE public.notification_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage confirmations" ON public.notification_confirmations FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Users can insert own confirmations" ON public.notification_confirmations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own confirmations" ON public.notification_confirmations FOR SELECT USING (auth.uid() = user_id);

-- Enable realtime for scheduled_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_notifications;
