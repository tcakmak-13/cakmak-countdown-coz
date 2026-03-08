
-- Add coach_id column to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.profiles(id);

-- Drop old RLS policies on appointments
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Coaches can manage assigned student appointments" ON public.appointments;
DROP POLICY IF EXISTS "Coaches can view assigned student appointments" ON public.appointments;
DROP POLICY IF EXISTS "Students can delete own pending appointments" ON public.appointments;
DROP POLICY IF EXISTS "Students can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Students can view own appointments" ON public.appointments;

-- New RLS policies using helper functions

-- Admin: read-only view of ALL appointments
CREATE POLICY "Admins can view all appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Coach: full CRUD on appointments where coach_id matches
CREATE POLICY "Coaches can view own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (coach_id = get_my_profile_id() AND has_role(auth.uid(), 'koc'));

CREATE POLICY "Coaches can insert own appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = get_my_profile_id() AND has_role(auth.uid(), 'koc'));

CREATE POLICY "Coaches can update own appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (coach_id = get_my_profile_id() AND has_role(auth.uid(), 'koc'));

CREATE POLICY "Coaches can delete own appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (coach_id = get_my_profile_id() AND has_role(auth.uid(), 'koc'));

-- Students: view own, insert own, delete own pending
CREATE POLICY "Students can view own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (student_id = get_my_profile_id());

CREATE POLICY "Students can insert own appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (student_id = get_my_profile_id());

CREATE POLICY "Students can delete own pending appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (student_id = get_my_profile_id() AND status = 'pending');
