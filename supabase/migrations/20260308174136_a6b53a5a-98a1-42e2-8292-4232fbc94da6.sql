
-- Create helper functions to avoid RLS recursion on profiles

-- Get the profile ID for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Get profile IDs of students assigned to the current coach
CREATE OR REPLACE FUNCTION public.get_my_student_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.id FROM public.profiles p
  WHERE p.coach_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
$$;

-- Check if a profile belongs to a coach (for student coach selection)
CREATE OR REPLACE FUNCTION public.is_coach_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.user_id
    WHERE p.id = _profile_id AND r.role = 'koc'
  )
$$;

-- Drop all existing SELECT/UPDATE policies on profiles that cause recursion
DROP POLICY IF EXISTS "Coaches can view assigned students" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can update assigned students" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Students can view coach profiles for selection" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Recreate all profiles policies using helper functions (no recursion)

-- Admin policies
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Users can view/update own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Coaches can view their assigned students (using helper function)
CREATE POLICY "Coaches can view assigned students" ON public.profiles
  FOR SELECT TO authenticated
  USING (id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));

-- Coaches can update their assigned students
CREATE POLICY "Coaches can update assigned students" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id IN (SELECT get_my_student_ids()) AND has_role(auth.uid(), 'koc'));

-- Students can view coach profiles for selection
CREATE POLICY "Students can view coach profiles for selection" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_coach_profile(id) AND auth.uid() IS NOT NULL);
