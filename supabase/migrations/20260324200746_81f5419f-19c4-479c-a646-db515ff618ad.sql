-- ========== NOTIFICATIONS: scope admin to company ==========
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins can manage company notifications"
ON public.notifications FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

CREATE POLICY "Super admins manage all notifications"
ON public.notifications FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== RESOURCES: scope admin to company ==========
DROP POLICY IF EXISTS "Admins can manage all resources" ON public.resources;
CREATE POLICY "Admins can manage company resources"
ON public.resources FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(coach_id))
WITH CHECK (has_role(auth.uid(), 'admin') AND is_same_company(coach_id));

CREATE POLICY "Super admins manage all resources"
ON public.resources FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== STUDENT_BOOKS: scope admin ==========
DROP POLICY IF EXISTS "Admins can manage all books" ON public.student_books;
CREATE POLICY "Admins can manage company books"
ON public.student_books FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(student_id))
WITH CHECK (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

CREATE POLICY "Super admins manage all books"
ON public.student_books FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== STUDY_TIMER_LOGS: scope admin ==========
DROP POLICY IF EXISTS "Admins can manage all timer logs" ON public.study_timer_logs;
CREATE POLICY "Admins can manage company timer logs"
ON public.study_timer_logs FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(student_id))
WITH CHECK (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

CREATE POLICY "Super admins manage all timer logs"
ON public.study_timer_logs FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== CUSTOM_STUDY_PERIODS: scope admin ==========
DROP POLICY IF EXISTS "Admins can manage all periods" ON public.custom_study_periods;
CREATE POLICY "Admins can manage company periods"
ON public.custom_study_periods FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') AND is_same_company(student_id))
WITH CHECK (has_role(auth.uid(), 'admin') AND is_same_company(student_id));

CREATE POLICY "Super admins manage all periods"
ON public.custom_study_periods FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== USER_ROLES: scope admin ==========
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== COACH_INFO: add super_admin ==========
CREATE POLICY "Super admins manage all coach_info"
ON public.coach_info FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ========== COACH_AVAILABILITY: add super_admin ==========
CREATE POLICY "Super admins manage all availability"
ON public.coach_availability FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));