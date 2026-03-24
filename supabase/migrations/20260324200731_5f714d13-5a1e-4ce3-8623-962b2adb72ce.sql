-- ========== STUDY_TASKS: scope admin to company ==========
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.study_tasks;
CREATE POLICY "Admins can view company tasks"
ON public.study_tasks FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

DROP POLICY IF EXISTS "Admins can insert any tasks" ON public.study_tasks;
CREATE POLICY "Admins can insert company tasks"
ON public.study_tasks FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

DROP POLICY IF EXISTS "Admins can update all tasks" ON public.study_tasks;
CREATE POLICY "Admins can update company tasks"
ON public.study_tasks FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

DROP POLICY IF EXISTS "Admins can delete any tasks" ON public.study_tasks;
CREATE POLICY "Admins can delete company tasks"
ON public.study_tasks FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

-- Super admin on study_tasks
CREATE POLICY "Super admins manage all tasks"
ON public.study_tasks FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== DENEME_RESULTS: scope admin to company ==========
DROP POLICY IF EXISTS "Admins can manage all results" ON public.deneme_results;
DROP POLICY IF EXISTS "Admins can view all results" ON public.deneme_results;
CREATE POLICY "Admins can view company results"
ON public.deneme_results FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

CREATE POLICY "Admins can manage company results"
ON public.deneme_results FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(student_id))
WITH CHECK (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

CREATE POLICY "Super admins manage all results"
ON public.deneme_results FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== ERROR_QUESTIONS: scope admin to company ==========
DROP POLICY IF EXISTS "Admins can manage all error questions" ON public.error_questions;
CREATE POLICY "Admins can manage company error questions"
ON public.error_questions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(student_id))
WITH CHECK (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

CREATE POLICY "Super admins manage all error questions"
ON public.error_questions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== CHAT_MESSAGES: scope admin to company ==========
DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;
CREATE POLICY "Admins can view company messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') AND (is_same_company(sender_id) OR is_same_company(receiver_id)));

DROP POLICY IF EXISTS "Admins can update all messages" ON public.chat_messages;
CREATE POLICY "Admins can update company messages"
ON public.chat_messages FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND (is_same_company(sender_id) OR is_same_company(receiver_id)));

DROP POLICY IF EXISTS "Admins can send as self" ON public.chat_messages;
CREATE POLICY "Admins can send messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins manage all messages"
ON public.chat_messages FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== APPOINTMENTS: scope admin to company ==========
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
CREATE POLICY "Admins can view company appointments"
ON public.appointments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

CREATE POLICY "Super admins manage all appointments"
ON public.appointments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));