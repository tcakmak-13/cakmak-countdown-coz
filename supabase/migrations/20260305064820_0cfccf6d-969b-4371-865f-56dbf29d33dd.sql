
-- Appointments table
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'video' CHECK (type IN ('video', 'voice')),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Students can view their own appointments
CREATE POLICY "Students can view own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Students can insert own appointments
CREATE POLICY "Students can insert own appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Admins can do everything
CREATE POLICY "Admins can manage all appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Students can delete own pending appointments
CREATE POLICY "Students can delete own pending appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (
    student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND status = 'pending'
  );

-- Updated_at trigger
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger for new appointment requests (notify admin)
CREATE OR REPLACE FUNCTION public.notify_on_new_appointment()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  student_name text;
  admin_uid uuid;
  type_label text;
BEGIN
  SELECT full_name INTO student_name FROM public.profiles WHERE id = NEW.student_id;
  SELECT ur.user_id INTO admin_uid FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1;
  type_label := CASE WHEN NEW.type = 'video' THEN 'Görüntülü' ELSE 'Sesli' END;
  
  IF admin_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, icon, link)
    VALUES (
      admin_uid,
      'Yeni Randevu Talebi',
      COALESCE(student_name, 'Bir öğrenci') || ' ' || type_label || ' görüşme talep etti.',
      'appointment',
      'calendar',
      '/admin'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_appointment();

-- Notification trigger for appointment approval (notify student)
CREATE OR REPLACE FUNCTION public.notify_on_appointment_status()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  student_uid uuid;
  status_label text;
  type_label text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    SELECT user_id INTO student_uid FROM public.profiles WHERE id = NEW.student_id;
    type_label := CASE WHEN NEW.type = 'video' THEN 'Görüntülü' ELSE 'Sesli' END;
    status_label := CASE WHEN NEW.status = 'approved' THEN 'Koçun Tarafından Onaylandı ✅' ELSE 'Koçun Tarafından Reddedildi ❌' END;
    
    IF student_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, icon, link)
      VALUES (
        student_uid,
        type_label || ' Randevun ' || status_label,
        'Randevu tarihi: ' || to_char(NEW.scheduled_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
        'appointment',
        'calendar',
        '/student'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_appointment_status
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_appointment_status();

-- Enable realtime for appointments
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
