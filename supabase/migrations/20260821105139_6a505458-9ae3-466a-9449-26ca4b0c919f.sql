
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','viewer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- new user -> profile, first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- LOV TABLES
CREATE TABLE public.departments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.locations   (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.regions     (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.wings       (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.designations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.trainers    (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_code text NOT NULL UNIQUE,
  training_name text NOT NULL,
  training_type text NOT NULL CHECK (training_type IN ('classroom','virtual')),
  training_date date NOT NULL,
  trainer_id uuid REFERENCES public.trainers(id),
  venue text,
  description text,
  start_time time,
  end_time time,
  department_id uuid REFERENCES public.departments(id),
  location_id uuid REFERENCES public.locations(id),
  business_unit text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  category text NOT NULL CHECK (category IN ('venue','content','trainer','overall')),
  training_type text NOT NULL DEFAULT 'both' CHECK (training_type IN ('classroom','virtual','both')),
  question_type text NOT NULL DEFAULT 'rating' CHECK (question_type IN ('rating','yesno','choice','text')),
  options jsonb,
  display_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.respondents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text NOT NULL,
  cnic text NOT NULL,
  name text NOT NULL,
  designation_id uuid REFERENCES public.designations(id),
  department_id uuid REFERENCES public.departments(id),
  location_id uuid REFERENCES public.locations(id),
  region_id uuid REFERENCES public.regions(id),
  wing_id uuid REFERENCES public.wings(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id uuid NOT NULL REFERENCES public.respondents(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES public.trainings(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  recommendation boolean,
  useful_aspect text,
  improvement_suggestion text,
  additional_comments text,
  -- historical snapshots (never change)
  employee_code text,
  employee_name text,
  designation_name text,
  department_name text,
  location_name text,
  region_name text,
  wing_name text,
  training_name text,
  training_code text,
  training_type text,
  training_date date,
  trainer_name text,
  -- computed aggregates
  content_rating numeric(4,2),
  trainer_rating numeric(4,2),
  venue_rating numeric(4,2),
  overall_rating numeric(4,2),
  quality_score numeric(5,2)
);
CREATE INDEX idx_feedback_training ON public.feedback(training_id);
CREATE INDEX idx_feedback_submitted ON public.feedback(submitted_at);

CREATE TABLE public.feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.feedback_questions(id),
  question_text text,
  category text,
  rating int CHECK (rating BETWEEN 1 AND 5),
  answer_text text
);
CREATE INDEX idx_fr_feedback ON public.feedback_responses(feedback_id);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid,
  admin_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- GRANTS
GRANT SELECT ON public.departments, public.locations, public.regions, public.wings, public.designations, public.trainers, public.trainings, public.feedback_questions, public.app_settings TO anon;
GRANT INSERT ON public.respondents, public.feedback, public.feedback_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments, public.locations, public.regions, public.wings, public.designations, public.trainers, public.trainings, public.feedback_questions, public.respondents, public.feedback, public.feedback_responses, public.audit_logs, public.app_settings TO authenticated;
GRANT ALL ON public.departments, public.locations, public.regions, public.wings, public.designations, public.trainers, public.trainings, public.feedback_questions, public.respondents, public.feedback, public.feedback_responses, public.audit_logs, public.app_settings TO service_role;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respondents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- public read of active LOVs / trainings / questions
CREATE POLICY "public active departments" ON public.departments FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "public active locations" ON public.locations FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "public active regions" ON public.regions FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "public active wings" ON public.wings FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "public active designations" ON public.designations FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "public active trainers" ON public.trainers FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "public active trainings" ON public.trainings FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "public active questions" ON public.feedback_questions FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "public read settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

-- admin manage
CREATE POLICY "admin departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin locations" ON public.locations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin regions" ON public.regions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin wings" ON public.wings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin designations" ON public.designations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin trainers" ON public.trainers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin trainings" ON public.trainings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin questions" ON public.feedback_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- submissions: anyone may insert, only admins may read
CREATE POLICY "anyone submits respondent" ON public.respondents FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin reads respondents" ON public.respondents FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manages respondents" ON public.respondents FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "anyone submits feedback" ON public.feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin reads feedback" ON public.feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin deletes feedback" ON public.feedback FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "anyone submits responses" ON public.feedback_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin reads responses" ON public.feedback_responses FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin deletes responses" ON public.feedback_responses FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin reads audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin writes audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- snapshot trigger on feedback insert
CREATE OR REPLACE FUNCTION public.feedback_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; t RECORD;
BEGIN
  SELECT rs.employee_code, rs.name,
         d.name AS designation_name, dp.name AS department_name,
         l.name AS location_name, rg.name AS region_name, w.name AS wing_name
    INTO r
  FROM public.respondents rs
  LEFT JOIN public.designations d ON d.id = rs.designation_id
  LEFT JOIN public.departments dp ON dp.id = rs.department_id
  LEFT JOIN public.locations l ON l.id = rs.location_id
  LEFT JOIN public.regions rg ON rg.id = rs.region_id
  LEFT JOIN public.wings w ON w.id = rs.wing_id
  WHERE rs.id = NEW.respondent_id;

  SELECT tr.training_name, tr.training_code, tr.training_type, tr.training_date, tn.name AS trainer_name
    INTO t
  FROM public.trainings tr LEFT JOIN public.trainers tn ON tn.id = tr.trainer_id
  WHERE tr.id = NEW.training_id;

  NEW.employee_code := r.employee_code;
  NEW.employee_name := r.name;
  NEW.designation_name := r.designation_name;
  NEW.department_name := r.department_name;
  NEW.location_name := r.location_name;
  NEW.region_name := r.region_name;
  NEW.wing_name := r.wing_name;
  NEW.training_name := t.training_name;
  NEW.training_code := t.training_code;
  NEW.training_type := t.training_type;
  NEW.training_date := t.training_date;
  NEW.trainer_name := t.trainer_name;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_feedback_snapshot BEFORE INSERT ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.feedback_snapshot();

-- recompute aggregates after responses inserted
CREATE OR REPLACE FUNCTION public.recalc_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c numeric; tr numeric; v numeric; o numeric; ttype text; w jsonb; q numeric;
BEGIN
  SELECT avg(rating) FILTER (WHERE category='content'),
         avg(rating) FILTER (WHERE category='trainer'),
         avg(rating) FILTER (WHERE category='venue'),
         avg(rating) FILTER (WHERE category='overall')
    INTO c, tr, v, o
  FROM public.feedback_responses WHERE feedback_id = NEW.feedback_id AND rating IS NOT NULL;

  SELECT training_type INTO ttype FROM public.feedback WHERE id = NEW.feedback_id;
  SELECT value INTO w FROM public.app_settings WHERE key = 'quality_weights';

  IF o IS NULL THEN
    SELECT avg(rating) INTO o FROM public.feedback_responses WHERE feedback_id = NEW.feedback_id AND rating IS NOT NULL;
  END IF;

  IF ttype = 'classroom' THEN
    q := (COALESCE(c,0)*COALESCE((w->'classroom'->>'content')::numeric,0.35)
        + COALESCE(tr,0)*COALESCE((w->'classroom'->>'trainer')::numeric,0.35)
        + COALESCE(v,0)*COALESCE((w->'classroom'->>'venue')::numeric,0.15)
        + COALESCE(o,0)*COALESCE((w->'classroom'->>'overall')::numeric,0.15)) / 5 * 100;
  ELSE
    q := (COALESCE(c,0)*COALESCE((w->'virtual'->>'content')::numeric,0.40)
        + COALESCE(tr,0)*COALESCE((w->'virtual'->>'trainer')::numeric,0.40)
        + COALESCE(o,0)*COALESCE((w->'virtual'->>'overall')::numeric,0.20)) / 5 * 100;
  END IF;

  UPDATE public.feedback SET content_rating = round(c,2), trainer_rating = round(tr,2),
    venue_rating = round(v,2), overall_rating = round(o,2), quality_score = round(q,2)
  WHERE id = NEW.feedback_id;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_recalc_feedback AFTER INSERT ON public.feedback_responses
FOR EACH ROW EXECUTE FUNCTION public.recalc_feedback();

-- duplicate check callable by anonymous employees (returns boolean only)
CREATE OR REPLACE FUNCTION public.feedback_already_submitted(_employee_code text, _training_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.feedback WHERE lower(employee_code) = lower(_employee_code) AND training_id = _training_id);
$$;
GRANT EXECUTE ON FUNCTION public.feedback_already_submitted(text, uuid) TO anon, authenticated;

CREATE TRIGGER u1 BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER u2 BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER u3 BEFORE UPDATE ON public.regions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER u4 BEFORE UPDATE ON public.wings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER u5 BEFORE UPDATE ON public.designations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER u6 BEFORE UPDATE ON public.trainers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER u7 BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER u8 BEFORE UPDATE ON public.feedback_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SETTINGS SEED
INSERT INTO public.app_settings (key, value) VALUES
 ('rating_threshold', '4.0'::jsonb),
 ('min_sample_size', '10'::jsonb),
 ('allow_multiple_submissions', 'false'::jsonb),
 ('quality_weights', '{"classroom":{"content":0.35,"trainer":0.35,"venue":0.15,"overall":0.15},"virtual":{"content":0.40,"trainer":0.40,"overall":0.20}}'::jsonb);

-- LOV SEED
INSERT INTO public.departments (name) VALUES ('Retail Banking'),('Operations'),('Human Resources'),('Information Technology'),('Risk Management'),('Compliance'),('Finance'),('Corporate Banking');
INSERT INTO public.locations (name) VALUES ('Islamabad'),('Lahore'),('Karachi'),('Peshawar'),('Quetta'),('Multan'),('Faisalabad');
INSERT INTO public.regions (name) VALUES ('North'),('South'),('Central'),('East'),('West');
INSERT INTO public.wings (name) VALUES ('Business Wing'),('Operations Wing'),('Support Wing'),('Credit Wing'),('Technology Wing');
INSERT INTO public.designations (name) VALUES ('Branch Manager'),('Operations Manager'),('Relationship Manager'),('Regional Manager'),('Officer'),('Assistant Manager'),('Senior Manager');
INSERT INTO public.trainers (name) VALUES ('Ahmed Raza'),('Sana Khalid'),('Bilal Hussain'),('Farah Iqbal');

-- QUESTION SEED
INSERT INTO public.feedback_questions (question_text, category, training_type, question_type, display_order) VALUES
('The training venue was appropriate and comfortable.','venue','classroom','rating',1),
('Seating arrangements were satisfactory.','venue','classroom','rating',2),
('Audio/visual facilities were adequate.','venue','classroom','rating',3),
('Training materials/resources were properly arranged.','venue','classroom','rating',4),
('Overall training environment was satisfactory.','venue','classroom','rating',5),
('Training objectives were clearly explained.','content','both','rating',10),
('Content was relevant to my job.','content','both','rating',11),
('Content was easy to understand.','content','both','rating',12),
('Training provided useful practical knowledge.','content','both','rating',13),
('Content was well organized.','content','both','rating',14),
('Examples/case studies were relevant.','content','both','rating',15),
('Training duration was appropriate.','content','both','rating',16),
('Training met my expectations.','content','both','rating',17),
('Trainer demonstrated strong subject knowledge.','trainer','both','rating',20),
('Trainer explained concepts clearly.','trainer','both','rating',21),
('Trainer encouraged participation.','trainer','both','rating',22),
('Trainer handled questions effectively.','trainer','both','rating',23),
('Trainer used relevant examples.','trainer','both','rating',24),
('Trainer maintained participant engagement.','trainer','classroom','rating',25),
('Trainer maintained participant engagement in the virtual environment.','trainer','virtual','rating',25),
('Trainer communicated effectively.','trainer','both','rating',26),
('Trainer managed the session effectively.','trainer','classroom','rating',27),
('Trainer managed the virtual session effectively.','trainer','virtual','rating',27),
('Trainer demonstrated professionalism.','trainer','both','rating',28),
('Overall, trainer was effective.','trainer','both','rating',29),
('Overall, how would you rate this training?','overall','both','rating',40);
