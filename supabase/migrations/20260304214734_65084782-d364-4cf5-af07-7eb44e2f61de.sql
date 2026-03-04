
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS target_university text DEFAULT '',
ADD COLUMN IF NOT EXISTS target_department text DEFAULT '';
