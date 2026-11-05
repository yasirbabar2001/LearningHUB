create or replace function public.presence_stamp() returns trigger language plpgsql set search_path=public as $$
begin new.last_seen_at := now(); return new; end; $$;
drop trigger if exists presence_stamp on public.user_presence;
create trigger presence_stamp before insert or update on public.user_presence for each row execute function public.presence_stamp();

CREATE OR REPLACE FUNCTION public.dm_guard_update() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  NEW.sender_id := OLD.sender_id; NEW.recipient_id := OLD.recipient_id;
  NEW.body := OLD.body; NEW.created_at := OLD.created_at; NEW.team_admin_id := OLD.team_admin_id;
  NEW.reply_to_id := OLD.reply_to_id; NEW.attachment_path := OLD.attachment_path;
  NEW.attachment_name := OLD.attachment_name; NEW.attachment_type := OLD.attachment_type;
  IF OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL THEN NEW.delivered_at := now();
  ELSIF OLD.delivered_at IS NOT NULL THEN NEW.delivered_at := OLD.delivered_at; END IF;
  IF OLD.read_at IS NULL AND NEW.read_at IS NOT NULL THEN
    NEW.read_at := now(); NEW.delivered_at := coalesce(NEW.delivered_at, now());
  ELSIF OLD.read_at IS NOT NULL THEN NEW.read_at := OLD.read_at; END IF;
  RETURN NEW;
END; $function$;