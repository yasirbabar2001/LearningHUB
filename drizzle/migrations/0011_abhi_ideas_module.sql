CREATE TABLE public.idea_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('category','type','benefit','beneficiary','recognition')),
  code text,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, name)
);
GRANT SELECT ON public.idea_options TO authenticated;
GRANT ALL ON public.idea_options TO service_role;
ALTER TABLE public.idea_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in read idea options" ON public.idea_options FOR SELECT TO authenticated USING (true);

CREATE SEQUENCE public.idea_ref_seq;

CREATE TABLE public.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no text UNIQUE,
  user_id uuid NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  employee_code text, employee_name text, designation_name text, department_name text,
  location_name text, region_name text, wing_name text, manager_name text,
  category_id uuid REFERENCES public.idea_options(id),
  type_id uuid REFERENCES public.idea_options(id),
  title text NOT NULL,
  problem text NOT NULL,
  solution text NOT NULL,
  benefit_ids uuid[] NOT NULL DEFAULT '{}',
  beneficiary_ids uuid[] NOT NULL DEFAULT '{}',
  expected_impact text,
  implement_scope text,
  complexity text,
  attachment_path text,
  attachment_name text,
  status text NOT NULL DEFAULT 'Submitted',
  is_public boolean NOT NULL DEFAULT false,
  assigned_function text,
  assigned_owner text,
  assigned_reviewer uuid,
  target_date date,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ideas_user_idx ON public.ideas(user_id);
CREATE INDEX ideas_status_idx ON public.ideas(status);
CREATE INDEX ideas_submitted_idx ON public.ideas(submitted_at);
GRANT SELECT ON public.ideas TO authenticated;
GRANT ALL ON public.ideas TO service_role;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ideas read" ON public.ideas FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read ideas" ON public.ideas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE OR REPLACE FUNCTION public.assign_idea_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.ref_no := 'ABI-IDEA-' || lpad(nextval('public.idea_ref_seq')::text, 6, '0');
  ELSE
    NEW.ref_no := OLD.ref_no;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.assign_idea_ref() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ideas_ref BEFORE INSERT OR UPDATE ON public.ideas FOR EACH ROW EXECUTE FUNCTION public.assign_idea_ref();

CREATE TABLE public.idea_assessments (
  idea_id uuid PRIMARY KEY REFERENCES public.ideas(id) ON DELETE CASCADE,
  strategic text, customer text, business text, financial text, operational text, risk text, complexity text,
  final_impact text,
  estimated_cost numeric, estimated_saving numeric, estimated_revenue numeric,
  implementation_time text,
  assessed_by uuid, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.idea_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  author_id uuid, author_name text,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  attachment_path text, attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idea_comments_idea_idx ON public.idea_comments(idea_id);
CREATE TABLE public.idea_implementations (
  idea_id uuid PRIMARY KEY REFERENCES public.ideas(id) ON DELETE CASCADE,
  owner text, supporting_department text,
  start_date date, target_date date, actual_date date,
  budget numeric, actual_cost numeric, estimated_benefit numeric, actual_benefit numeric,
  status text, notes text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.idea_impacts (
  idea_id uuid PRIMARY KEY REFERENCES public.ideas(id) ON DELETE CASCADE,
  est_annual_saving numeric, actual_annual_saving numeric, est_revenue numeric, actual_revenue numeric,
  hours_saved numeric, processes_simplified integer, tat_reduction_pct numeric, manual_steps_eliminated integer,
  customers_affected integer, customer_tat_improvement_pct numeric, complaint_reduction_pct numeric, csat_improvement_pct numeric,
  employee_hours_saved numeric, productivity_improvement_pct numeric, employee_experience text,
  risks_reduced integer, control_improvements text, loss_prevented numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.idea_recognitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  recognition_id uuid REFERENCES public.idea_options(id),
  recognition_name text NOT NULL,
  period text,
  awarded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.idea_reviewers (
  user_id uuid PRIMARY KEY,
  employee_code text, name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.idea_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid REFERENCES public.ideas(id) ON DELETE CASCADE,
  actor_id uuid, actor_name text,
  action text NOT NULL,
  field text, old_value text, new_value text, comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idea_audit_idea_idx ON public.idea_audit(idea_id);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['idea_assessments','idea_comments','idea_implementations','idea_impacts','idea_recognitions','idea_reviewers','idea_audit'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "admins read %s" ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ''admin''))', t, t);
  END LOOP;
END $$;
CREATE POLICY "reviewer reads self" ON public.idea_reviewers FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.idea_options (kind, code, name, description, sort_order) VALUES
('category','A','Customer Experience & Service','Faster onboarding, better branch service, reduced waiting time, improved communication',1),
('category','B','Products & Business Growth','New products, product improvements, cross-selling, market expansion, revenue',2),
('category','C','Branch Operations','Branch processes, productivity, documentation, cash operations, efficiency',3),
('category','D','Credit & Lending','Loan origination, credit assessment, disbursement, portfolio quality',4),
('category','E','Collections & Portfolio Quality','Recovery, delinquency, PAR reduction, field collections',5),
('category','F','Digital Banking & Technology','Digital channels, automation, APIs, data, AI, digital transformation',6),
('category','G','Process Simplification & Automation','Remove steps, reduce paperwork, simplify approvals, faster TAT',7),
('category','H','Cost Optimization','Reduce costs, better resource use, eliminate waste, savings',8),
('category','I','Risk, Compliance & Internal Controls','Controls, fraud prevention, compliance, audit readiness',9),
('category','J','People & Employee Experience','Engagement, recognition, careers, well-being, communication',10),
('category','K','Learning & Capability Development','Training, onboarding, knowledge sharing, leadership development',11),
('category','L','Islamic Finance','Shariah-compliant products, processes, awareness, education',12),
('category','M','Financial Inclusion & Social Impact','Underserved, women, rural and low-income customers',13),
('category','N','Sales & Customer Acquisition','Sales productivity, leads, penetration, relationship management',14),
('category','O','Data, Analytics & Management Information','Dashboards, reporting, data quality, forecasting, BI',15),
('category','P','Security, Fraud Prevention & Cybersecurity','Information security, fraud, physical security, data protection',16),
('category','Q','Sustainability & Green Banking','Paper reduction, energy efficiency, green products, ESG',17),
('category','R','Other / Cross-Functional','Ideas that do not fit the categories above',18);
INSERT INTO public.idea_options (kind, name, sort_order)
SELECT 'type', n, o FROM unnest(ARRAY['Process Improvement','Cost Saving','Revenue/Business Growth','Customer Experience','Employee Experience','Risk Reduction','Compliance Improvement','Technology/Automation','New Product/Service','Productivity Improvement','Innovation','Financial Inclusion','Other']) WITH ORDINALITY AS x(n,o);
INSERT INTO public.idea_options (kind, name, sort_order)
SELECT 'benefit', n, o FROM unnest(ARRAY['Customer Experience','Revenue Growth','Cost Saving','Productivity','Risk Reduction','Compliance','Employee Experience','Process Efficiency','Financial Inclusion','Digital Transformation','Other']) WITH ORDINALITY AS x(n,o);
INSERT INTO public.idea_options (kind, name, sort_order)
SELECT 'beneficiary', n, o FROM unnest(ARRAY['Customers','Branches','Sales Teams','Operations','Credit','Collections','Employees','Management','Digital/Technology','Bank-wide','Other']) WITH ORDINALITY AS x(n,o);
INSERT INTO public.idea_options (kind, name, sort_order)
SELECT 'recognition', n, o FROM unnest(ARRAY['Idea of the Month','Idea of the Quarter','Innovation Spotlight','Implemented Idea','High Impact Idea']) WITH ORDINALITY AS x(n,o);
