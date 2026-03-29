
-- Fix: allow service_role to set is_approved=true (for edge functions)
CREATE OR REPLACE FUNCTION public.enforce_approval_by_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved = true AND (TG_OP = 'INSERT' OR OLD.is_approved IS DISTINCT FROM NEW.is_approved) THEN
    -- Allow service_role (edge functions) and super_admin
    IF current_setting('role', true) = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      NEW.is_approved := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
