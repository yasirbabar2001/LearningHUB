ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS liked_at timestamptz;

CREATE OR REPLACE FUNCTION public.dm_guard_update()
 RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$
BEGIN
  NEW.sender_id := OLD.sender_id; NEW.recipient_id := OLD.recipient_id;
  NEW.body := OLD.body; NEW.created_at := OLD.created_at; NEW.team_admin_id := OLD.team_admin_id;
  NEW.reply_to_id := OLD.reply_to_id; NEW.attachment_path := OLD.attachment_path;
  NEW.attachment_name := OLD.attachment_name; NEW.attachment_type := OLD.attachment_type;
  RETURN NEW;
END; $function$;

CREATE POLICY "chat att upload own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "chat att read participants" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments' AND (
  (storage.foldername(name))[1] = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.direct_messages m
             WHERE m.attachment_path = storage.objects.name
               AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid()))
));