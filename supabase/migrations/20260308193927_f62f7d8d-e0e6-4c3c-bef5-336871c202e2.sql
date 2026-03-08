
-- Questions table
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'TYT',
  subject text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'open',
  best_answer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Question answers table
CREATE TABLE public.question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  image_url text,
  is_best boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key for best_answer_id
ALTER TABLE public.questions ADD CONSTRAINT questions_best_answer_id_fkey FOREIGN KEY (best_answer_id) REFERENCES public.question_answers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;

-- Questions RLS: Everyone authenticated can read
CREATE POLICY "Authenticated users can view questions" ON public.questions FOR SELECT TO authenticated USING (true);

-- Students can create their own questions
CREATE POLICY "Students can create questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (student_id = get_my_profile_id());

-- Students can update their own questions (for marking best answer)
CREATE POLICY "Students can update own questions" ON public.questions FOR UPDATE TO authenticated USING (student_id = get_my_profile_id());

-- Admins can manage all questions
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Answers RLS: Everyone authenticated can read
CREATE POLICY "Authenticated users can view answers" ON public.question_answers FOR SELECT TO authenticated USING (true);

-- Authenticated users can create answers
CREATE POLICY "Authenticated users can create answers" ON public.question_answers FOR INSERT TO authenticated WITH CHECK (author_id = get_my_profile_id());

-- Answer author can update own answers
CREATE POLICY "Users can update own answers" ON public.question_answers FOR UPDATE TO authenticated USING (author_id = get_my_profile_id());

-- Question owner can update answers (for is_best)
CREATE POLICY "Question owner can update answers" ON public.question_answers FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.questions WHERE questions.id = question_answers.question_id AND questions.student_id = get_my_profile_id())
);

-- Admins can manage all answers
CREATE POLICY "Admins can manage answers" ON public.question_answers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can delete questions
CREATE POLICY "Admins can delete questions" ON public.questions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Admins can delete answers
CREATE POLICY "Admins can delete answers" ON public.question_answers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Students can delete own questions
CREATE POLICY "Students can delete own questions" ON public.questions FOR DELETE TO authenticated USING (student_id = get_my_profile_id());

-- Storage bucket for question images
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);

-- Storage policies for question-images
CREATE POLICY "Authenticated users can upload question images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'question-images');
CREATE POLICY "Anyone can view question images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'question-images');
CREATE POLICY "Users can delete own question images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'question-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Enable realtime for questions and answers
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.question_answers;
