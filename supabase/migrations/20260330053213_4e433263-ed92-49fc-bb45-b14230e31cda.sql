
-- Create company-logos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow super_admin to upload company logos
CREATE POLICY "Super admins can upload company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND public.has_role(auth.uid(), 'super_admin')
);

-- Allow super_admin to update company logos
CREATE POLICY "Super admins can update company logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND public.has_role(auth.uid(), 'super_admin')
);

-- Allow super_admin to delete company logos
CREATE POLICY "Super admins can delete company logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND public.has_role(auth.uid(), 'super_admin')
);

-- Allow anyone authenticated to view company logos (public bucket)
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'company-logos');
