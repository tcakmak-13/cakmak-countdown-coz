
-- Add firm_admin INSERT policy for chat_messages
CREATE POLICY "Firm admins can send messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'firm_admin') 
  AND sender_id = get_my_profile_id()
);

-- Add firm_admin SELECT policy scoped to own company
CREATE POLICY "Firm admins can view company messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'firm_admin') 
  AND (
    sender_id = get_my_profile_id() 
    OR receiver_id = get_my_profile_id()
    OR (is_same_company(sender_id) AND is_same_company(receiver_id))
  )
);

-- Add firm_admin UPDATE policy for marking read
CREATE POLICY "Firm admins can update own received messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'firm_admin') 
  AND receiver_id = get_my_profile_id()
);
