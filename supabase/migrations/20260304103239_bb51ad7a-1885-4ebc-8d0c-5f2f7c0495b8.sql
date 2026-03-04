-- Make chat-files bucket private
UPDATE storage.buckets SET public = false WHERE name = 'chat-files';

-- Allow authenticated users to upload to their own folder (using auth.uid)
CREATE POLICY "Users can upload own chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view files in their own folder or if admin
CREATE POLICY "Users can view own chat files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Add content length constraint to chat_messages
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_content_max_length CHECK (length(content) <= 2000);