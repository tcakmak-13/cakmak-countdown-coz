
DROP FUNCTION public.get_admin_profile_info();

CREATE OR REPLACE FUNCTION public.get_admin_profile_info()
 RETURNS TABLE(id uuid, full_name text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.user_id
  WHERE r.role = 'admin'
  LIMIT 1
$$;
