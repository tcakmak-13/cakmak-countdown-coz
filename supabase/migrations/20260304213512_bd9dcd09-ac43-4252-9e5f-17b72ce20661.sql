
-- Security definer function to create notifications (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text DEFAULT 'info',
  _icon text DEFAULT 'bell',
  _link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, icon, link)
  VALUES (_user_id, _title, _message, _type, _icon, _link);
END;
$$;

-- Trigger: notify admin when student sends a message
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  sender_name text;
  receiver_user_id uuid;
BEGIN
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT user_id INTO receiver_user_id FROM public.profiles WHERE id = NEW.receiver_id;
  
  IF receiver_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, icon, link)
    VALUES (
      receiver_user_id,
      'Yeni Mesaj',
      COALESCE(sender_name, 'Birisi') || ' size bir mesaj gönderdi.',
      'message',
      'mail',
      '/mesajlar'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();

-- Trigger: notify admin when student enters deneme result
CREATE OR REPLACE FUNCTION public.notify_on_deneme()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  student_name text;
  admin_uid uuid;
BEGIN
  SELECT full_name INTO student_name FROM public.profiles WHERE id = NEW.student_id;
  SELECT ur.user_id INTO admin_uid FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1;
  
  IF admin_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, icon, link)
    VALUES (
      admin_uid,
      'Yeni Deneme Kaydı',
      COALESCE(student_name, 'Bir öğrenci') || ' yeni bir ' || NEW.exam_type || ' denemesi kaydetti.',
      'exam',
      'chart',
      '/admin'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_deneme
  AFTER INSERT ON public.deneme_results
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_deneme();

-- Trigger: notify admin when student completes all daily tasks
CREATE OR REPLACE FUNCTION public.notify_on_tasks_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  student_name text;
  admin_uid uuid;
  total_tasks int;
  completed_tasks int;
  current_dow int;
BEGIN
  IF NEW.completed = true AND (OLD.completed IS DISTINCT FROM NEW.completed) THEN
    current_dow := EXTRACT(DOW FROM now())::int;
    SELECT count(*) INTO total_tasks FROM public.study_tasks WHERE student_id = NEW.student_id AND day_of_week = current_dow;
    SELECT count(*) INTO completed_tasks FROM public.study_tasks WHERE student_id = NEW.student_id AND day_of_week = current_dow AND completed = true;
    
    IF total_tasks > 0 AND completed_tasks = total_tasks THEN
      SELECT full_name INTO student_name FROM public.profiles WHERE id = NEW.student_id;
      SELECT ur.user_id INTO admin_uid FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1;
      
      IF admin_uid IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, icon, link)
        VALUES (
          admin_uid,
          'Program Tamamlandı! 🎉',
          COALESCE(student_name, 'Bir öğrenci') || ' günlük programını %100 tamamladı!',
          'success',
          'check',
          '/admin'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_tasks_complete
  AFTER UPDATE ON public.study_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_tasks_complete();
