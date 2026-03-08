
-- Fix recursion in other tables by using get_my_profile_id() and get_my_student_ids()

-- APPOINTMENTS: Fix student policies
DROP POLICY IF EXISTS "Students can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Students can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Students can delete own pending appointments" ON public.appointments;
DROP POLICY IF EXISTS "Coaches can view assigned student appointments" ON public.appointments;
DROP POLICY IF EXISTS "Coaches can manage assigned student appointments" ON public.appointments;

CREATE POLICY "Students can insert own appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (student_id = get_my_profile_id());

CREATE POLICY "Students can view own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can delete own pending appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (student_id = get_my_profile_id() AND status = 'pending');

CREATE POLICY "Coaches can view assigned student appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));

CREATE POLICY "Coaches can manage assigned student appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));

-- CHAT_MESSAGES: Fix policies
DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can mark own received messages as read" ON public.chat_messages;
DROP POLICY IF EXISTS "Coaches can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Coaches can view messages with assigned students" ON public.chat_messages;
DROP POLICY IF EXISTS "Coaches can update messages" ON public.chat_messages;

CREATE POLICY "Users can send messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = get_my_profile_id());

CREATE POLICY "Users can view own messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (sender_id = get_my_profile_id() OR receiver_id = get_my_profile_id());

CREATE POLICY "Users can mark own received messages as read" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (receiver_id = get_my_profile_id());

CREATE POLICY "Coaches can send messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'koc') AND sender_id = get_my_profile_id());

CREATE POLICY "Coaches can view messages with assigned students" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'koc') AND (sender_id = get_my_profile_id() OR receiver_id = get_my_profile_id()));

CREATE POLICY "Coaches can update messages" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'koc') AND receiver_id = get_my_profile_id());

-- DENEME_RESULTS: Fix policies
DROP POLICY IF EXISTS "Students can insert own results" ON public.deneme_results;
DROP POLICY IF EXISTS "Students can view own results" ON public.deneme_results;
DROP POLICY IF EXISTS "Students can delete own results" ON public.deneme_results;
DROP POLICY IF EXISTS "Coaches can view assigned student results" ON public.deneme_results;

CREATE POLICY "Students can insert own results" ON public.deneme_results
  FOR INSERT TO authenticated
  WITH CHECK (student_id = get_my_profile_id());

CREATE POLICY "Students can view own results" ON public.deneme_results
  FOR SELECT TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can delete own results" ON public.deneme_results
  FOR DELETE TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Coaches can view assigned student results" ON public.deneme_results
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));

-- ERROR_QUESTIONS: Fix policies
DROP POLICY IF EXISTS "Students can insert own error questions" ON public.error_questions;
DROP POLICY IF EXISTS "Students can view own error questions" ON public.error_questions;
DROP POLICY IF EXISTS "Students can update own error questions" ON public.error_questions;
DROP POLICY IF EXISTS "Students can delete own error questions" ON public.error_questions;
DROP POLICY IF EXISTS "Coaches can view assigned student errors" ON public.error_questions;

CREATE POLICY "Students can insert own error questions" ON public.error_questions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = get_my_profile_id());

CREATE POLICY "Students can view own error questions" ON public.error_questions
  FOR SELECT TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can update own error questions" ON public.error_questions
  FOR UPDATE TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can delete own error questions" ON public.error_questions
  FOR DELETE TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Coaches can view assigned student errors" ON public.error_questions
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));

-- STUDY_TASKS: Fix policies
DROP POLICY IF EXISTS "Students can insert own tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Students can view own tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Students can update own tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Students can delete own tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Coaches can view assigned student tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Coaches can insert assigned student tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Coaches can update assigned student tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Coaches can delete assigned student tasks" ON public.study_tasks;

CREATE POLICY "Students can insert own tasks" ON public.study_tasks
  FOR INSERT TO authenticated
  WITH CHECK (student_id = get_my_profile_id());

CREATE POLICY "Students can view own tasks" ON public.study_tasks
  FOR SELECT TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can update own tasks" ON public.study_tasks
  FOR UPDATE TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can delete own tasks" ON public.study_tasks
  FOR DELETE TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Coaches can view assigned student tasks" ON public.study_tasks
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));

CREATE POLICY "Coaches can insert assigned student tasks" ON public.study_tasks
  FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));

CREATE POLICY "Coaches can update assigned student tasks" ON public.study_tasks
  FOR UPDATE TO authenticated
  USING (student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));

CREATE POLICY "Coaches can delete assigned student tasks" ON public.study_tasks
  FOR DELETE TO authenticated
  USING (student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));

-- STUDY_TIMER_LOGS: Fix policies
DROP POLICY IF EXISTS "Students can insert own timer logs" ON public.study_timer_logs;
DROP POLICY IF EXISTS "Students can view own timer logs" ON public.study_timer_logs;
DROP POLICY IF EXISTS "Students can update own timer logs" ON public.study_timer_logs;
DROP POLICY IF EXISTS "Coaches can view assigned student timer logs" ON public.study_timer_logs;

CREATE POLICY "Students can insert own timer logs" ON public.study_timer_logs
  FOR INSERT TO authenticated
  WITH CHECK (student_id = get_my_profile_id());

CREATE POLICY "Students can view own timer logs" ON public.study_timer_logs
  FOR SELECT TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can update own timer logs" ON public.study_timer_logs
  FOR UPDATE TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Coaches can view assigned student timer logs" ON public.study_timer_logs
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));
