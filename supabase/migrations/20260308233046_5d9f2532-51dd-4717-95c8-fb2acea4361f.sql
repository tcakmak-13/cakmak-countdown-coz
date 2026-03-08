
-- Add allowed_areas column to subjects (text array)
ALTER TABLE public.subjects ADD COLUMN allowed_areas text[] DEFAULT '{}';
