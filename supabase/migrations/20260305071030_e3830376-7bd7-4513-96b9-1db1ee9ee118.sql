
-- Add recurring fields to appointments table
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recurring_day integer,
  ADD COLUMN IF NOT EXISTS recurring_time text,
  ADD COLUMN IF NOT EXISTS series_ended_at timestamptz;

-- Update existing appointments to set recurring_day and recurring_time from scheduled_at
UPDATE public.appointments
SET
  recurring_day = EXTRACT(DOW FROM scheduled_at AT TIME ZONE 'Europe/Istanbul')::int,
  recurring_time = to_char(scheduled_at AT TIME ZONE 'Europe/Istanbul', 'HH24:MI')
WHERE recurring_day IS NULL;
