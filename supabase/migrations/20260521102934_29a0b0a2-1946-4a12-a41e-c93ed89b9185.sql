
CREATE OR REPLACE FUNCTION public.create_seed_matches_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seed_id uuid;
  pref text;
BEGIN
  pref := NEW.interested_in;

  FOR seed_id IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.is_seed = true
      AND p.banned = false
      AND p.id <> NEW.id
      AND (
        pref IS NULL
        OR lower(pref) IN ('everyone', 'both', 'any')
        OR lower(p.gender) = lower(pref)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.matches m
        WHERE (m.user_a = NEW.id AND m.user_b = p.id)
           OR (m.user_a = p.id AND m.user_b = NEW.id)
      )
    ORDER BY random()
    LIMIT 5
  LOOP
    INSERT INTO public.matches (user_a, user_b, status, manual, score)
    VALUES (NEW.id, seed_id, 'active'::match_status, false, 0);
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_create_seed_matches_on_onboarded ON public.profiles;

CREATE TRIGGER trg_create_seed_matches_on_onboarded
AFTER INSERT OR UPDATE OF onboarded ON public.profiles
FOR EACH ROW
WHEN (NEW.onboarded = true AND NEW.is_seed = false)
EXECUTE FUNCTION public.create_seed_matches_for_new_user();
