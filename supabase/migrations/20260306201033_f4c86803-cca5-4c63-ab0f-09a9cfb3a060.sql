
-- Table to persist stopwatch elapsed seconds per task per day
CREATE TABLE public.study_timer_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.study_tasks(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  elapsed_seconds integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(task_id, log_date)
);

ALTER TABLE public.study_timer_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Students can view own timer logs" ON public.study_timer_logs
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can insert own timer logs" ON public.study_timer_logs
  FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can update own timer logs" ON public.study_timer_logs
  FOR UPDATE TO authenticated
  USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all timer logs" ON public.study_timer_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
