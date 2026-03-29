
-- 1. FIX is_approved DEFAULT → false
ALTER TABLE public.profiles ALTER COLUMN is_approved SET DEFAULT false;

-- 2. TRIGGER: Only super_admin can set is_approved=true
CREATE OR REPLACE FUNCTION public.enforce_approval_by_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved = true AND (TG_OP = 'INSERT' OR OLD.is_approved IS DISTINCT FROM NEW.is_approved) THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      NEW.is_approved := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_approval ON public.profiles;
CREATE TRIGGER trg_enforce_approval
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_approval_by_super_admin();

-- 3. FIX get_coach_profiles() - filter by same company
CREATE OR REPLACE FUNCTION public.get_coach_profiles()
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
    AND p.is_approved = true
    AND p.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
$$;

-- 4. FIX is_coach_profile() - check same company
CREATE OR REPLACE FUNCTION public.is_coach_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.user_id
    WHERE p.id = _profile_id 
      AND r.role = 'koc'
      AND p.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  )
$$;

-- 5. FIX PROFILES RLS - Replace leaky coach visibility
DROP POLICY IF EXISTS "Students can view coach profiles for selection" ON public.profiles;
CREATE POLICY "Students can view same-company coach profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    is_coach_profile(id) 
    AND company_id = get_my_company_id()
  );

DROP POLICY IF EXISTS "Firm admins can view company profiles" ON public.profiles;
CREATE POLICY "Firm admins can view company profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'firm_admin'::app_role) 
    AND company_id IS NOT NULL 
    AND company_id = get_my_company_id()
  );

CREATE POLICY "Firm admins can update company profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'firm_admin'::app_role)
    AND company_id IS NOT NULL
    AND company_id = get_my_company_id()
  );

-- 6. Add company-scoped policies for missing tables
CREATE POLICY "Firm admins can view company questions"
  ON public.questions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'firm_admin'::app_role) 
    AND is_same_company(student_id)
  );

CREATE POLICY "Firm admins can view company answers"
  ON public.question_answers FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'firm_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.questions q 
      WHERE q.id = question_answers.question_id 
      AND is_same_company(q.student_id)
    )
  );
