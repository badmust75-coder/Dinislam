
ALTER TABLE public.admin_conversations 
ADD COLUMN IF NOT EXISTS topic text DEFAULT 'Nouvelle conversation',
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS messages jsonb DEFAULT '[]'::jsonb;
