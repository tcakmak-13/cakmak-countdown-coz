
-- Table to store ranking calculation results
CREATE TABLE public.ranking_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_area text NOT NULL DEFAULT 'SAY',
  tyt_turkce_net numeric NOT NULL DEFAULT 0,
  tyt_sosyal_net numeric NOT NULL DEFAULT 0,
  tyt_matematik_net numeric NOT NULL DEFAULT 0,
  tyt_fen_net numeric NOT NULL DEFAULT 0,
  tyt_total_net numeric NOT NULL DEFAULT 0,
  ayt_total_net numeric NOT NULL DEFAULT 0,
  obp numeric NOT NULL DEFAULT 0,
  calculated_score numeric NOT NULL DEFAULT 0,
  estimated_ranking_low integer NOT NULL DEFAULT 0,
  estimated_ranking_high integer NOT NULL DEFAULT 0,
  source_type text NOT NULL DEFAULT 'manual',
  source_deneme_ids text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ranking_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own calculations"
ON public.ranking_calculations FOR SELECT
TO authenticated
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can insert own calculations"
ON public.ranking_calculations FOR INSERT
TO authenticated
WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can delete own calculations"
ON public.ranking_calculations FOR DELETE
TO authenticated
USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all calculations"
ON public.ranking_calculations FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all calculations"
ON public.ranking_calculations FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));
