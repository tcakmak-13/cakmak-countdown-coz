
-- Add coach_id and coach_selected to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_selected boolean NOT NULL DEFAULT false;

-- RLS: Coaches can view their assigned students' profiles
CREATE POLICY "Coaches can view assigned students"
ON public.profiles FOR SELECT
USING (
  coach_id IN (
    SELECT p.id FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.user_id
    WHERE p.user_id = auth.uid() AND r.role = 'koc'
  )
);

-- RLS: Coaches can view own profile
CREATE POLICY "Coaches can view own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'koc'));

-- RLS: Coaches can update own profile
CREATE POLICY "Coaches can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'koc'));

-- RLS: Coaches can update assigned students' profiles
CREATE POLICY "Coaches can update assigned students"
ON public.profiles FOR UPDATE
USING (
  coach_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  AND public.has_role(auth.uid(), 'koc')
);

-- RLS: Coaches can view assigned students' study_tasks
CREATE POLICY "Coaches can view assigned student tasks"
ON public.study_tasks FOR SELECT
USING (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.coach_id IN (
      SELECT pp.id FROM public.profiles pp WHERE pp.user_id = auth.uid()
    )
  )
  AND public.has_role(auth.uid(), 'koc')
);

CREATE POLICY "Coaches can insert assigned student tasks"
ON public.study_tasks FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.coach_id IN (
      SELECT pp.id FROM public.profiles pp WHERE pp.user_id = auth.uid()
    )
  )
  AND public.has_role(auth.uid(), 'koc')
);

CREATE POLICY "Coaches can update assigned student tasks"
ON public.study_tasks FOR UPDATE
USING (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.coach_id IN (
      SELECT pp.id FROM public.profiles pp WHERE pp.user_id = auth.uid()
    )
  )
  AND public.has_role(auth.uid(), 'koc')
);

CREATE POLICY "Coaches can delete assigned student tasks"
ON public.study_tasks FOR DELETE
USING (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.coach_id IN (
      SELECT pp.id FROM public.profiles pp WHERE pp.user_id = auth.uid()
    )
  )
  AND public.has_role(auth.uid(), 'koc')
);

-- RLS: Coaches can view assigned students' deneme_results
CREATE POLICY "Coaches can view assigned student results"
ON public.deneme_results FOR SELECT
USING (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.coach_id IN (
      SELECT pp.id FROM public.profiles pp WHERE pp.user_id = auth.uid()
    )
  )
  AND public.has_role(auth.uid(), 'koc')
);

-- RLS: Coaches chat messages
CREATE POLICY "Coaches can view messages with assigned students"
ON public.chat_messages FOR SELECT
USING (
  public.has_role(auth.uid(), 'koc')
  AND (
    sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Coaches can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'koc')
  AND sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches can update messages"
ON public.chat_messages FOR UPDATE
USING (
  public.has_role(auth.uid(), 'koc')
  AND receiver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- RLS: Coaches can view/manage assigned student appointments
CREATE POLICY "Coaches can view assigned student appointments"
ON public.appointments FOR SELECT
USING (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.coach_id IN (
      SELECT pp.id FROM public.profiles pp WHERE pp.user_id = auth.uid()
    )
  )
  AND public.has_role(auth.uid(), 'koc')
);

CREATE POLICY "Coaches can manage assigned student appointments"
ON public.appointments FOR UPDATE
USING (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.coach_id IN (
      SELECT pp.id FROM public.profiles pp WHERE pp.user_id = auth.uid()
    )
  )
  AND public.has_role(auth.uid(), 'koc')
);

-- RLS: Coaches can view assigned students' error_questions
CREATE POLICY "Coaches can view assigned student errors"
ON public.error_questions FOR SELECT
USING (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.coach_id IN (
      SELECT pp.id FROM public.profiles pp WHERE pp.user_id = auth.uid()
    )
  )
  AND public.has_role(auth.uid(), 'koc')
);

-- RLS: Coaches can view assigned students' timer logs
CREATE POLICY "Coaches can view assigned student timer logs"
ON public.study_timer_logs FOR SELECT
USING (
  student_id IN (
    SELECT p.id FROM public.profiles p WHERE p.coach_id IN (
      SELECT pp.id FROM public.profiles pp WHERE pp.user_id = auth.uid()
    )
  )
  AND public.has_role(auth.uid(), 'koc')
);

-- RLS: Coaches notifications
CREATE POLICY "Coaches can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'koc'));

CREATE POLICY "Coaches can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'koc'));

CREATE POLICY "Coaches can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'koc'));

-- RLS: Coaches can manage their own coach_info
CREATE POLICY "Coaches can manage own coach_info"
ON public.coach_info FOR ALL
USING (public.has_role(auth.uid(), 'koc'))
WITH CHECK (public.has_role(auth.uid(), 'koc'));

-- Allow students to view coach profiles for coach selection screen
CREATE POLICY "Students can view coach profiles for selection"
ON public.profiles FOR SELECT
USING (
  id IN (
    SELECT p.id FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.user_id
    WHERE r.role = 'koc'
  )
  AND auth.uid() IS NOT NULL
);
