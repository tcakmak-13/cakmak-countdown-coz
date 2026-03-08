
-- Coach availability windows table
CREATE TABLE public.coach_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_id, day_of_week, start_time)
);

ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;

-- Coaches can manage their own availability
CREATE POLICY "Coaches can manage own availability"
ON public.coach_availability FOR ALL
TO authenticated
USING (coach_id = get_my_profile_id() AND has_role(auth.uid(), 'koc'))
WITH CHECK (coach_id = get_my_profile_id() AND has_role(auth.uid(), 'koc'));

-- Admins can manage all availability
CREATE POLICY "Admins can manage all availability"
ON public.coach_availability FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Anyone authenticated can view availability (students need to see it)
CREATE POLICY "Authenticated users can view availability"
ON public.coach_availability FOR SELECT
TO authenticated
USING (true);

-- Add duration_minutes to appointments
ALTER TABLE public.appointments ADD COLUMN duration_minutes integer NOT NULL DEFAULT 60;
