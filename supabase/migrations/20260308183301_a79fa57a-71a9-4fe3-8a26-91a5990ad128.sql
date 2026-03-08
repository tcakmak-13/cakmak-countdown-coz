DROP FUNCTION IF EXISTS public.get_coach_profiles();

CREATE FUNCTION public.get_coach_profiles()
RETURNS TABLE(id uuid, full_name text, avatar_url text, username text, title text, bio text, yks_ranking text, experience text, tyt_net text, ayt_net text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.username,
    COALESCE(ci.title, 'YKS Koçu') as title,
    COALESCE(ci.bio, '') as bio,
    COALESCE(ci.yks_ranking, '-') as yks_ranking,
    COALESCE(ci.experience, '-') as experience,
    COALESCE(ci.tyt_net, '-') as tyt_net,
    COALESCE(ci.ayt_net, '-') as ayt_net
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.user_id
  LEFT JOIN public.coach_info ci ON ci.id = p.id
  WHERE r.role = 'koc'
$$;