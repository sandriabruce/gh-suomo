CREATE OR REPLACE FUNCTION public.auto_accept_seed_matches()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  a_seed boolean;
  b_seed boolean;
BEGIN
  SELECT is_seed INTO a_seed FROM public.profiles WHERE id = NEW.user_a;
  SELECT is_seed INTO b_seed FROM public.profiles WHERE id = NEW.user_b;
  IF COALESCE(a_seed, false) OR COALESCE(b_seed, false) THEN
    NEW.status := 'active'::match_status;
  END IF;
  RETURN NEW;
END;
$function$;