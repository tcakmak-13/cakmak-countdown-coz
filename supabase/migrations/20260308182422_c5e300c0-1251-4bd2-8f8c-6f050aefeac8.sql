CREATE OR REPLACE FUNCTION public.get_coach_profiles()
RETURNS TABLE(id uuid, full_name text, avatar_url text, username text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.username
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.user_id
  WHERE r.role = 'koc'
$$;