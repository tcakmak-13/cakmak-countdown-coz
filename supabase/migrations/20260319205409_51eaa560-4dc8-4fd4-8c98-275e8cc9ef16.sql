
-- Drop the policies that were already created by the partial migration
DROP POLICY IF EXISTS "Users can read own error question images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own error question images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own error question images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own error question images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all error question images" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can read student error question images" ON storage.objects;

-- Recreate owner-scoped policies
CREATE POLICY "Users can read own error question images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'error-questions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own error question images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'error-questions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own error question images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'error-questions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own error question images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'error-questions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can manage all error question images"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'error-questions' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'error-questions' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can read student error question images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'error-questions' AND public.has_role(auth.uid(), 'koc'));
