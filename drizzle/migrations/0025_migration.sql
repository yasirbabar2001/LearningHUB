ALTER TABLE public.feedback_questions DROP CONSTRAINT IF EXISTS feedback_questions_category_check;
ALTER TABLE public.feedback_questions ADD CONSTRAINT feedback_questions_category_check CHECK (category IN ('venue','content','trainer','overall','portal'));

INSERT INTO public.feedback_questions (question_text, category, training_type, question_type, display_order) VALUES
('The portal connection was stable throughout the session (no drops or interruptions).','portal','virtual','rating',41),
('Pages, PDFs and videos loaded quickly without delays.','portal','virtual','rating',42),
('The login and access process to the portal was easy and smooth.','portal','virtual','rating',43);

CREATE OR REPLACE FUNCTION public.recalc_feedback()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c numeric; tr numeric; v numeric; o numeric; ttype text; w jsonb; q numeric;
  wc numeric; wt numeric; wo numeric; tot numeric;
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
    wc := CASE WHEN c IS NULL THEN 0 ELSE COALESCE((w->'virtual'->>'content')::numeric,0.40) END;
    wt := CASE WHEN tr IS NULL THEN 0 ELSE COALESCE((w->'virtual'->>'trainer')::numeric,0.40) END;
    wo := CASE WHEN o IS NULL THEN 0 ELSE COALESCE((w->'virtual'->>'overall')::numeric,0.20) END;
    tot := wc + wt + wo;
    q := CASE WHEN tot = 0 THEN 0 ELSE
      (COALESCE(c,0)*wc + COALESCE(tr,0)*wt + COALESCE(o,0)*wo) / tot / 5 * 100 END;
  END IF;

  UPDATE public.feedback SET content_rating = round(c,2), trainer_rating = round(tr,2),
    venue_rating = round(v,2), overall_rating = round(o,2), quality_score = round(q,2)
  WHERE id = NEW.feedback_id;
  RETURN NULL;
END; $function$;