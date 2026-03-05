
-- Create error_questions table
CREATE TABLE public.error_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_type text NOT NULL DEFAULT 'TYT',
  subject text NOT NULL,
  image_url text NOT NULL,
  status text NOT NULL DEFAULT 'unsolved',
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_questions ENABLE ROW LEVEL SECURITY;

-- Students can view own questions
CREATE POLICY "Students can view own error questions"
ON public.error_questions FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Students can insert own questions
CREATE POLICY "Students can insert own error questions"
ON public.error_questions FOR INSERT TO authenticated
WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Students can update own questions
CREATE POLICY "Students can update own error questions"
ON public.error_questions FOR UPDATE TO authenticated
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Students can delete own questions
CREATE POLICY "Students can delete own error questions"
ON public.error_questions FOR DELETE TO authenticated
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Admins can manage all
CREATE POLICY "Admins can manage all error questions"
ON public.error_questions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create storage bucket for error question images
INSERT INTO storage.buckets (id, name, public) VALUES ('error-questions', 'error-questions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own error question images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'error-questions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own error question images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'error-questions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read error question images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'error-questions');

CREATE POLICY "Users can delete own error question images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'error-questions' AND (storage.foldername(name))[1] = auth.uid()::text);
