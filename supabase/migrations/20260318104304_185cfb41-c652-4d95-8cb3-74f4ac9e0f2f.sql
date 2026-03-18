CREATE TABLE IF NOT EXISTS public.sourate_versets_audio (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sourate_id uuid REFERENCES public.sourates(id) ON DELETE CASCADE,
  sourate_number integer NOT NULL,
  verset_number integer NOT NULL,
  audio_url text NOT NULL,
  file_path text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sourate_id, verset_number)
);

ALTER TABLE public.sourate_versets_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_versets_audio" ON public.sourate_versets_audio
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "students_read_versets_audio" ON public.sourate_versets_audio
FOR SELECT TO authenticated
USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('sourates-versets', 'sourates-versets', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "admin_upload_versets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sourates-versets' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "public_read_versets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sourates-versets');

CREATE POLICY "admin_delete_versets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'sourates-versets' 
  AND public.has_role(auth.uid(), 'admin')
);