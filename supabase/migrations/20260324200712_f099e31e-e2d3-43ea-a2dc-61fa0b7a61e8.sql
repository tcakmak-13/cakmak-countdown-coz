-- Helper: get current user's company_id
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Helper: check if a profile belongs to same company as current user
CREATE OR REPLACE FUNCTION public.is_same_company(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _profile_id
    AND company_id IS NOT NULL
    AND company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  )
$$;

-- ========== COMPANIES: allow admins to create & manage own ==========
CREATE POLICY "Admins can insert companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update own company"
ON public.companies FOR UPDATE TO authenticated
USING (id = public.get_my_company_id());

-- ========== PROFILES: scope admin to company ==========
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view company profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') AND company_id = get_my_company_id());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update company profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND company_id = get_my_company_id());

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete company profiles"
ON public.profiles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND company_id = get_my_company_id());

-- Super admin full access on profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete all profiles"
ON public.profiles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'));