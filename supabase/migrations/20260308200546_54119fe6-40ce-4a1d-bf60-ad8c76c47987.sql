-- Allow answer authors to delete their own answers
CREATE POLICY "Users can delete own answers"
ON public.question_answers
FOR DELETE
TO authenticated
USING (author_id = get_my_profile_id());

-- Allow coaches to delete any answers
CREATE POLICY "Coaches can delete answers"
ON public.question_answers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'koc'::app_role));

-- Allow coaches to delete any questions
CREATE POLICY "Coaches can delete questions"
ON public.questions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'koc'::app_role));