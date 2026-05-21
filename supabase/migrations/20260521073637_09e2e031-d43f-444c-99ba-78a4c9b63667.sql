
-- 2) Auto-ban users reported 3+ times
CREATE OR REPLACE FUNCTION public.auto_ban_reported_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_count int;
BEGIN
  SELECT count(*) INTO report_count
  FROM public.reports
  WHERE reported_id = NEW.reported_id;

  IF report_count >= 3 THEN
    UPDATE public.profiles
    SET banned = true, flagged = true
    WHERE id = NEW.reported_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_ban_reported ON public.reports;
CREATE TRIGGER trg_auto_ban_reported
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.auto_ban_reported_users();

-- 3) Enforce 40+ age at onboarding completion
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
    AND NEW.age >= 40
    AND NEW.age <= 120;

  IF NEW.onboarded = true AND NOT is_complete THEN
    RAISE EXCEPTION 'Profile cannot be marked onboarded: first_name, gender, interested_in and age (40-120) are required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT is_complete THEN
    NEW.onboarded := false;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Require confirmed email before sending messages
CREATE OR REPLACE FUNCTION public.current_user_email_confirmed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email_confirmed_at IS NOT NULL
  );
$$;

DROP POLICY IF EXISTS "Users send to own matches" ON public.messages;
CREATE POLICY "Users send to own matches"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.current_user_email_confirmed()
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = messages.match_id
      AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
  )
);
