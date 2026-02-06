-- Create storage bucket for ramadan videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ramadan-videos', 'ramadan-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view ramadan videos
CREATE POLICY "Public can view ramadan videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'ramadan-videos');

-- Allow admins to upload ramadan videos
CREATE POLICY "Admins can upload ramadan videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ramadan-videos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update ramadan videos
CREATE POLICY "Admins can update ramadan videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ramadan-videos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete ramadan videos
CREATE POLICY "Admins can delete ramadan videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ramadan-videos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);