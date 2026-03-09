
CREATE TABLE public.admin_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  topic text NOT NULL DEFAULT 'Nouvelle conversation',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their conversations"
ON public.admin_conversations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_admin_conversations_admin_user_id ON public.admin_conversations(admin_user_id);
CREATE INDEX idx_admin_conversations_updated_at ON public.admin_conversations(updated_at DESC);
