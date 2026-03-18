
DROP POLICY IF EXISTS "student_read_own_devoirs_audio" ON storage.objects;
DROP POLICY IF EXISTS "admin_read_all_devoirs_audio" ON storage.objects;

CREATE POLICY "public_read_devoirs_audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'devoirs-audios');

CREATE POLICY "auth_upload_devoirs_audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'devoirs-audios');
