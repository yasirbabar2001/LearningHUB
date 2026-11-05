CREATE OR REPLACE FUNCTION public.is_active_portal_user(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.portal_users WHERE id = _uid AND status = 'active')
$$;
GRANT EXECUTE ON FUNCTION public.is_active_portal_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "dm send" ON public.direct_messages;
CREATE POLICY "dm send" ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND sender_id <> recipient_id AND (
    (team_admin_id IS NULL AND public.is_active_portal_user(recipient_id))
    OR (team_admin_id = sender_id AND public.is_admin_user(sender_id))
    OR (team_admin_id = recipient_id AND public.is_admin_user(recipient_id))
  )
);

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
UPDATE public.direct_messages SET delivered_at = COALESCE(read_at, created_at) WHERE delivered_at IS NULL AND read_at IS NOT NULL;