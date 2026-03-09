-- Create resources storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true);

-- Create resources metadata table
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'assigned')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources table
-- Coaches can insert their own resources
CREATE POLICY "Coaches can insert own resources"
ON public.resources
FOR INSERT
TO authenticated
WITH CHECK (
  coach_id = get_my_profile_id() AND
  has_role(auth.uid(), 'koc')
);

-- Coaches can update their own resources
CREATE POLICY "Coaches can update own resources"
ON public.resources
FOR UPDATE
TO authenticated
USING (
  coach_id = get_my_profile_id() AND
  has_role(auth.uid(), 'koc')
);

-- Coaches can delete their own resources
CREATE POLICY "Coaches can delete own resources"
ON public.resources
FOR DELETE
TO authenticated
USING (
  coach_id = get_my_profile_id() AND
  has_role(auth.uid(), 'koc')
);

-- Coaches can view their own resources
CREATE POLICY "Coaches can view own resources"
ON public.resources
FOR SELECT
TO authenticated
USING (
  coach_id = get_my_profile_id() AND
  has_role(auth.uid(), 'koc')
);

-- Students can view resources (all or assigned)
CREATE POLICY "Students can view available resources"
ON public.resources
FOR SELECT
TO authenticated
USING (
  visibility = 'all' OR
  (visibility = 'assigned' AND coach_id IN (
    SELECT coach_id FROM public.profiles WHERE id = get_my_profile_id()
  ))
);

-- Admins can manage all resources
CREATE POLICY "Admins can manage all resources"
ON public.resources
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for storage.objects (resources bucket)
-- Coaches can upload to resources bucket
CREATE POLICY "Coaches can upload to resources bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources' AND
  has_role(auth.uid(), 'koc')
);

-- Coaches can update their own files
CREATE POLICY "Coaches can update own files in resources"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resources' AND
  has_role(auth.uid(), 'koc')
);

-- Coaches can delete their own files
CREATE POLICY "Coaches can delete own files in resources"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources' AND
  has_role(auth.uid(), 'koc')
);

-- Everyone authenticated can view resources (public bucket)
CREATE POLICY "Anyone authenticated can view resources files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'resources');

-- Admins can manage all files in resources
CREATE POLICY "Admins can manage resources bucket"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'resources' AND has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'resources' AND has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_resources_updated_at
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();