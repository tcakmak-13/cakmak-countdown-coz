CREATE OR REPLACE FUNCTION public.has_coach_info(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.coach_info WHERE id = _profile_id)
$$;