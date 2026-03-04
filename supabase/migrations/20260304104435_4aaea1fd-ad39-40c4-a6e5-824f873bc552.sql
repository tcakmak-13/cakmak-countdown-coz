
-- Drop old upload policy and recreate with MIME type validation
DROP POLICY IF EXISTS "Users can upload own chat files" ON storage.objects;

CREATE POLICY "Users can upload own chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    (metadata->>'mimetype') IS NOT NULL
    AND (metadata->>'mimetype') = ANY(ARRAY[
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'
    ])
  )
);
