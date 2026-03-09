CREATE EXTENSION IF NOT EXISTS pg_net;

-- Resource paylaşımında öğrencileri bilgilendir
CREATE OR REPLACE FUNCTION public.notify_on_new_resource()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient RECORD;
BEGIN
  IF NEW.visibility = 'all' THEN
    FOR recipient IN
      SELECT p.user_id
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE ur.role = 'student'
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, icon, link)
      VALUES (
        recipient.user_id,
        'Yeni Kaynak Paylaşıldı',
        'Koçun yeni bir kaynak paylaştı: ' || COALESCE(NEW.title, 'PDF Kaynağı') || ' 📄',
        'resource',
        'mail',
        '/student'
      );
    END LOOP;
  ELSE
    FOR recipient IN
      SELECT p.user_id
      FROM public.profiles p
      WHERE p.coach_id = NEW.coach_id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, icon, link)
      VALUES (
        recipient.user_id,
        'Yeni Kaynak Paylaşıldı',
        'Koçun yeni bir kaynak paylaştı: ' || COALESCE(NEW.title, 'PDF Kaynağı') || ' 📄',
        'resource',
        'mail',
        '/student'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Soruya yeni cevap geldiğinde soru sahibini bilgilendir
CREATE OR REPLACE FUNCTION public.notify_on_question_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  question_owner_profile_id uuid;
  question_owner_user_id uuid;
BEGIN
  SELECT q.student_id INTO question_owner_profile_id
  FROM public.questions q
  WHERE q.id = NEW.question_id;

  IF question_owner_profile_id IS NULL OR question_owner_profile_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT p.user_id INTO question_owner_user_id
  FROM public.profiles p
  WHERE p.id = question_owner_profile_id;

  IF question_owner_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, icon, link)
    VALUES (
      question_owner_user_id,
      'Soruna Yeni Cevap Geldi',
      'Sorun çözüldü, hemen bak! ✅',
      'question_answer',
      'mail',
      '/student'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Notifications INSERT olayını push fonksiyonuna ileten merkezi motor
CREATE OR REPLACE FUNCTION public.forward_notification_to_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://zyiddcizvemzlxbydytp.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5aWRkY2l6dmVtemx4YnlkeXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg2MjEsImV4cCI6MjA4ODA3NDYyMX0.zzXxFwf2cApLJnEl_iPEb3FOFc5rJ7detsDPTK0HBdE',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5aWRkY2l6dmVtemx4YnlkeXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg2MjEsImV4cCI6MjA4ODA3NDYyMX0.zzXxFwf2cApLJnEl_iPEb3FOFc5rJ7detsDPTK0HBdE'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'schema', 'public',
      'record', to_jsonb(NEW)
    )
  );

  RETURN NEW;
END;
$$;

-- Mevcut bildirim fonksiyonlarını olaylara bağla
DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.chat_messages;
CREATE TRIGGER trg_notify_on_new_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_message();

DROP TRIGGER IF EXISTS trg_notify_on_new_resource ON public.resources;
CREATE TRIGGER trg_notify_on_new_resource
AFTER INSERT ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_resource();

DROP TRIGGER IF EXISTS trg_notify_on_question_answer ON public.question_answers;
CREATE TRIGGER trg_notify_on_question_answer
AFTER INSERT ON public.question_answers
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_question_answer();

DROP TRIGGER IF EXISTS trg_notifications_push_webhook ON public.notifications;
CREATE TRIGGER trg_notifications_push_webhook
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.forward_notification_to_push();