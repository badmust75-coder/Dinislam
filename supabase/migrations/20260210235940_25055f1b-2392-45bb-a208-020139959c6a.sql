
-- Create storage bucket for nourania lesson content
INSERT INTO storage.buckets (id, name, public) VALUES ('nourania-content', 'nourania-content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for nourania-content bucket
CREATE POLICY "Anyone can view nourania content"
ON storage.objects FOR SELECT
USING (bucket_id = 'nourania-content');

CREATE POLICY "Admins can upload nourania content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'nourania-content' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete nourania content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'nourania-content' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create table for lesson content (videos, PDFs, images uploaded by admin)
CREATE TABLE public.nourania_lesson_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES public.nourania_lessons(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'pdf', 'image', 'document')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.nourania_lesson_content ENABLE ROW LEVEL SECURITY;

-- Everyone can view content
CREATE POLICY "Anyone can view lesson content"
ON public.nourania_lesson_content FOR SELECT
USING (true);

-- Only admins can manage content
CREATE POLICY "Admins can insert lesson content"
ON public.nourania_lesson_content FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update lesson content"
ON public.nourania_lesson_content FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete lesson content"
ON public.nourania_lesson_content FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
