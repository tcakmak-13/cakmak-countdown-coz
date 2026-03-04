CREATE OR REPLACE FUNCTION public.get_admin_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.user_id
  WHERE r.role = 'admin'
  LIMIT 1
$$;