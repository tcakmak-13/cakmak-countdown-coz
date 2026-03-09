-- Fix notification URLs to match actual React Router paths
-- Update notify_on_new_message to use correct path
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      '/student?tab=mesajlar'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Update notify_on_question_answer
CREATE OR REPLACE FUNCTION public.notify_on_question_answer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      '/student?tab=soru-cevap'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Update notify_on_new_resource
CREATE OR REPLACE FUNCTION public.notify_on_new_resource()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        '/student?tab=kaynaklar'
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
        '/student?tab=kaynaklar'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;