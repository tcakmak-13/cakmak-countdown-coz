
-- Subjects table
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type text NOT NULL DEFAULT 'TYT',
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  icon text DEFAULT 'book'
);

-- Topics table
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

-- User topic progress
CREATE TABLE public.user_topic_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, topic_id)
);

-- RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_progress ENABLE ROW LEVEL SECURITY;

-- Subjects & topics: everyone authenticated can read
CREATE POLICY "Anyone authenticated can read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read topics" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage topics" ON public.topics FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User progress: students manage own
CREATE POLICY "Students can view own progress" ON public.user_topic_progress FOR SELECT USING (student_id = get_my_profile_id());
CREATE POLICY "Students can insert own progress" ON public.user_topic_progress FOR INSERT WITH CHECK (student_id = get_my_profile_id());
CREATE POLICY "Students can update own progress" ON public.user_topic_progress FOR UPDATE USING (student_id = get_my_profile_id());
CREATE POLICY "Students can delete own progress" ON public.user_topic_progress FOR DELETE USING (student_id = get_my_profile_id());

-- Admins full access to progress
CREATE POLICY "Admins can manage all progress" ON public.user_topic_progress FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Coaches can view assigned student progress
CREATE POLICY "Coaches can view student progress" ON public.user_topic_progress FOR SELECT USING (
  student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'::app_role)
);

-- Index for performance
CREATE INDEX idx_user_topic_progress_student ON public.user_topic_progress(student_id);
CREATE INDEX idx_topics_subject ON public.topics(subject_id);
