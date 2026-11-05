ALTER TABLE public.portal_users
  ADD COLUMN IF NOT EXISTS onboarding_enabled boolean NOT NULL DEFAULT false;