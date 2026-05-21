
-- Rate-limit helper: how many messages a user sent in the last minute
CREATE OR REPLACE FUNCTION public.recent_message_count(_user_id uuid, _window interval DEFAULT interval '1 minute')
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.messages
  WHERE sender_id = _user_id
    AND created_at > now() - _window;
$$;

REVOKE ALL ON FUNCTION public.recent_message_count(uuid, interval) FROM PUBLIC, anon;

-- BEFORE INSERT trigger: enforce 20 messages / minute / sender
CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  recent int;
BEGIN
  SELECT count(*) INTO recent
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND created_at > now() - interval '1 minute';

  IF recent >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 20 messages per minute'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_message_rate_limit ON public.messages;
CREATE TRIGGER trg_enforce_message_rate_limit
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_message_rate_limit();

-- Lower onboarding age floor from 40 to 36
CREATE OR REPLACE FUNCTION public.validate_profile_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_complete boolean;
BEGIN
  is_complete :=
    NEW.first_name IS NOT NULL
    AND length(btrim(NEW.first_name)) > 0
    AND NEW.gender IS NOT NULL
    AND length(btrim(NEW.gender)) > 0
    AND NEW.interested_in IS NOT NULL
    AND length(btrim(NEW.interested_in)) > 0
    AND NEW.age IS NOT NULL
    AND NEW.age >= 36
    AND NEW.age <= 120;

  IF NEW.onboarded = true AND NOT is_complete THEN
    RAISE EXCEPTION 'Profile cannot be marked onboarded: first_name, gender, interested_in and age (36-120) are required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT is_complete THEN
    NEW.onboarded := false;
  END IF;

  RETURN NEW;
END;
$$;
