DROP POLICY IF EXISTS "Authenticated can view calendar participants" ON public.training_calendar_participants;

CREATE POLICY "Admins or own calendar rows"
ON public.training_calendar_participants
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.employee_code = training_calendar_participants.employee_code
  )
);