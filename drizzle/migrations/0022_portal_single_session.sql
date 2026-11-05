CREATE TABLE public.portal_active_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.portal_active_sessions TO service_role;
ALTER TABLE public.portal_active_sessions ENABLE ROW LEVEL SECURITY;