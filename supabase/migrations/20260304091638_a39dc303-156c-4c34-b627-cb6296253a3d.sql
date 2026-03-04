
-- Create deneme_results table for storing exam results
CREATE TABLE public.deneme_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL DEFAULT 'TYT', -- 'TYT' or 'AYT'
  turkce_dogru INTEGER NOT NULL DEFAULT 0,
  turkce_yanlis INTEGER NOT NULL DEFAULT 0,
  sosyal_dogru INTEGER NOT NULL DEFAULT 0,
  sosyal_yanlis INTEGER NOT NULL DEFAULT 0,
  matematik_dogru INTEGER NOT NULL DEFAULT 0,
  matematik_yanlis INTEGER NOT NULL DEFAULT 0,
  fen_dogru INTEGER NOT NULL DEFAULT 0,
  fen_yanlis INTEGER NOT NULL DEFAULT 0,
  turkce_net NUMERIC(5,2) NOT NULL DEFAULT 0,
  sosyal_net NUMERIC(5,2) NOT NULL DEFAULT 0,
  matematik_net NUMERIC(5,2) NOT NULL DEFAULT 0,
  fen_net NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deneme_results ENABLE ROW LEVEL SECURITY;

-- Students can view own results
CREATE POLICY "Students can view own results"
ON public.deneme_results FOR SELECT
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Students can insert own results
CREATE POLICY "Students can insert own results"
ON public.deneme_results FOR INSERT
WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Students can delete own results
CREATE POLICY "Students can delete own results"
ON public.deneme_results FOR DELETE
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Admins can view all results
CREATE POLICY "Admins can view all results"
ON public.deneme_results FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can manage all results
CREATE POLICY "Admins can manage all results"
ON public.deneme_results FOR ALL
USING (has_role(auth.uid(), 'admin'));
