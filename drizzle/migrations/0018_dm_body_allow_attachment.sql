ALTER TABLE public.direct_messages DROP CONSTRAINT direct_messages_body_check;
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_body_check
  CHECK (length(body) <= 4000 AND (length(body) >= 1 OR attachment_path IS NOT NULL));