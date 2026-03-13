
CREATE TABLE IF NOT EXISTS public.notification_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_banner boolean DEFAULT true,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notification_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_invitation" ON public.notification_invitations
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_invitation" ON public.notification_invitations
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_invitations" ON public.notification_invitations
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
