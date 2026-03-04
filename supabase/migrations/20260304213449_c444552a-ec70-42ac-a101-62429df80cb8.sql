
-- Fix overly permissive INSERT policy
DROP POLICY "Service can insert notifications" ON public.notifications;

-- Only admins can create notifications (they create for students), 
-- and system triggers will use security definer functions
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));
