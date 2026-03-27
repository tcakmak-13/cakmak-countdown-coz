
-- Fix the update policy to use proper USING clause instead of true
DROP POLICY IF EXISTS "Block super_admin role update" ON public.user_roles;
CREATE POLICY "Block super_admin role update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (role != 'super_admin');
