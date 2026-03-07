
-- Drop existing restrictive policies and recreate with correct path matching
DROP POLICY IF EXISTS "Users can upload error question images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own error question images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own error question images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all error question images" ON storage.objects;

-- Allow all authenticated users to upload to error-questions bucket
CREATE POLICY "Authenticated users can upload error questions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'error-questions');

-- Allow all authenticated users to read from error-questions bucket
CREATE POLICY "Authenticated users can read error questions"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'error-questions');

-- Allow all authenticated users to delete from error-questions bucket
CREATE POLICY "Authenticated users can delete error questions"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'error-questions');

-- Allow update for error-questions bucket
CREATE POLICY "Authenticated users can update error questions"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'error-questions');
