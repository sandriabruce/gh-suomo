
-- 1. Lower onboarding age floor 36 -> 35
CREATE OR REPLACE FUNCTION public.validate_profile_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
    AND NEW.age >= 35
    AND NEW.age <= 120;

  IF NEW.onboarded = true AND NOT is_complete THEN
    RAISE EXCEPTION 'Profile cannot be marked onboarded: first_name, gender, interested_in and age (35-120) are required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT is_complete THEN
    NEW.onboarded := false;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Verification status enum
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('unverified','pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Add verification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS photo_verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS age_verification_notes text,
  ADD COLUMN IF NOT EXISTS photo_verification_notes text;

-- 4. verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('age','photo')),
  id_type text CHECK (id_type IN ('ghana_card','passport','drivers_license','voter_id')),
  id_document_path text,
  selfie_path text,
  status public.verification_status NOT NULL DEFAULT 'pending',
  ai_extracted_dob date,
  ai_extracted_name text,
  ai_face_match_score numeric,
  ai_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS verification_requests_user_idx ON public.verification_requests(user_id, created_at DESC);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own verification requests" ON public.verification_requests;
CREATE POLICY "Users create own verification requests"
ON public.verification_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own verification requests" ON public.verification_requests;
CREATE POLICY "Users read own verification requests"
ON public.verification_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage verification requests" ON public.verification_requests;
CREATE POLICY "Admins manage verification requests"
ON public.verification_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Private storage bucket for verification uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('verifications','verifications', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own verification files" ON storage.objects;
CREATE POLICY "Users upload own verification files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users read own verification files" ON storage.objects;
CREATE POLICY "Users read own verification files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verifications'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Users delete own verification files" ON storage.objects;
CREATE POLICY "Users delete own verification files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'verifications'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
