-- Firm admins can view company profiles
CREATE POLICY "Firm admins can view company profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'firm_admin'::app_role) AND company_id = get_my_company_id());

-- Firm admins can view company coaches
CREATE POLICY "Firm admins can view company coach_info"
ON public.coach_info FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'firm_admin'::app_role) AND EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = coach_info.id AND p.company_id = get_my_company_id()
));

-- Firm admins can view company deneme results
CREATE POLICY "Firm admins can view company results"
ON public.deneme_results FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'firm_admin'::app_role) AND is_same_company(student_id));

-- Firm admins can view company study tasks
CREATE POLICY "Firm admins can view company tasks"
ON public.study_tasks FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'firm_admin'::app_role) AND is_same_company(student_id));

-- Firm admins can view own company
CREATE POLICY "Firm admins can view own company"
ON public.companies FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'firm_admin'::app_role) AND id = get_my_company_id());

-- Firm admins can view company appointments
CREATE POLICY "Firm admins can view company appointments"
ON public.appointments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'firm_admin'::app_role) AND is_same_company(student_id));

-- Firm admins can view own notifications
CREATE POLICY "Firm admins can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'firm_admin'::app_role) AND user_id = auth.uid());

CREATE POLICY "Firm admins can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'firm_admin'::app_role) AND user_id = auth.uid());