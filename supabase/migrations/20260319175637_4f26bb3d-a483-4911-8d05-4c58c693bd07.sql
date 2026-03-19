
CREATE TABLE public.student_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_type text NOT NULL DEFAULT 'TYT',
  subject text NOT NULL,
  book_name text NOT NULL,
  is_custom boolean NOT NULL DEFAULT false,
  total_tests integer NOT NULL DEFAULT 1,
  current_test integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_books ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX student_books_unique ON public.student_books (student_id, exam_type, subject, book_name);

CREATE POLICY "Students can view own books" ON public.student_books
  FOR SELECT TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can insert own books" ON public.student_books
  FOR INSERT TO authenticated
  WITH CHECK (student_id = get_my_profile_id());

CREATE POLICY "Students can update own books" ON public.student_books
  FOR UPDATE TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can delete own books" ON public.student_books
  FOR DELETE TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Admins can manage all books" ON public.student_books
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can view assigned student books" ON public.student_books
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));
