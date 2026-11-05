CREATE TABLE public.virtual_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL UNIQUE REFERENCES public.trainings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  require_all_content boolean NOT NULL DEFAULT true,
  certificate_title text NOT NULL DEFAULT 'Certificate of Completion',
  signatory_name text,
  signatory_designation text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_sessions TO authenticated;
GRANT ALL ON public.virtual_sessions TO service_role;
ALTER TABLE public.virtual_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vs admin all" ON public.virtual_sessions FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER u_virtual_sessions BEFORE UPDATE ON public.virtual_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.virtual_session_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.virtual_sessions(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pdf','video')),
  storage_path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_session_content TO authenticated;
GRANT ALL ON public.virtual_session_content TO service_role;
ALTER TABLE public.virtual_session_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vsc admin all" ON public.virtual_session_content FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TABLE public.virtual_content_views (
  user_id uuid NOT NULL,
  content_id uuid NOT NULL REFERENCES public.virtual_session_content(id) ON DELETE CASCADE,
  employee_code text,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_id)
);
GRANT SELECT ON public.virtual_content_views TO authenticated;
GRANT ALL ON public.virtual_content_views TO service_role;
ALTER TABLE public.virtual_content_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vcv own or admin read" ON public.virtual_content_views FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

CREATE SEQUENCE public.certificate_no_seq;
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_no text NOT NULL UNIQUE DEFAULT ('ABHI-CERT-' || lpad(nextval('public.certificate_no_seq')::text, 6, '0')),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.virtual_sessions(id) ON DELETE CASCADE,
  training_id uuid NOT NULL,
  employee_code text NOT NULL,
  employee_name text NOT NULL,
  designation_name text,
  training_name text NOT NULL,
  certificate_title text NOT NULL,
  signatory_name text,
  signatory_designation text,
  score_pct numeric,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, session_id)
);
GRANT SELECT, UPDATE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert own or admin read" ON public.certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));
CREATE POLICY "cert admin update" ON public.certificates FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "virtual content admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'virtual-content' AND public.is_admin_user(auth.uid()));
CREATE POLICY "virtual content admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'virtual-content' AND public.is_admin_user(auth.uid()));
CREATE POLICY "virtual content admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'virtual-content' AND public.is_admin_user(auth.uid()));