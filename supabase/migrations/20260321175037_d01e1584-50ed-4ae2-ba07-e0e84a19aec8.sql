
CREATE TABLE public.custom_study_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  work_minutes integer NOT NULL DEFAULT 45,
  break_minutes integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_study_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own periods"
  ON public.custom_study_periods FOR SELECT TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can insert own periods"
  ON public.custom_study_periods FOR INSERT TO authenticated
  WITH CHECK (student_id = get_my_profile_id());

CREATE POLICY "Students can delete own periods"
  ON public.custom_study_periods FOR DELETE TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Admins can manage all periods"
  ON public.custom_study_periods FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
