-- Allow all authenticated users to read roles (needed for contact discovery in chat)
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Allow firm_admins to manage roles (same as admin policy)
CREATE POLICY "Firm admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'firm_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'firm_admin'::app_role));