
-- Allow coaches to view firm_admin profiles from the same company (for chat contact discovery)
CREATE POLICY "Coaches can view same-company firm_admin profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'koc'::app_role)
  AND company_id IS NOT NULL
  AND company_id = get_my_company_id()
);
