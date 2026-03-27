
-- Prevent anyone from inserting super_admin role via client
DROP POLICY IF EXISTS "Block super_admin role insert" ON public.user_roles;
CREATE POLICY "Block super_admin role insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (role != 'super_admin');

-- Prevent anyone from updating a role TO super_admin via client
DROP POLICY IF EXISTS "Block super_admin role update" ON public.user_roles;
CREATE POLICY "Block super_admin role update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (role != 'super_admin');

-- Create a trigger to enforce only tcakmak1355 can have super_admin role
CREATE OR REPLACE FUNCTION public.enforce_single_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_username text;
BEGIN
  IF NEW.role = 'super_admin' THEN
    SELECT username INTO target_username FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
    IF target_username IS DISTINCT FROM 'tcakmak1355' THEN
      RAISE EXCEPTION 'Only tcakmak1355 can have super_admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_super_admin ON public.user_roles;
CREATE TRIGGER trg_enforce_single_super_admin
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_super_admin();
