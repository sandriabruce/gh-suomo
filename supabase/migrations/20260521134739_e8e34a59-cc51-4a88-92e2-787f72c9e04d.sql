ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS spicy_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS spicy_bio text,
  ADD COLUMN IF NOT EXISTS spicy_prompts jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS spicy boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_spicy_seed
  ON public.profiles (is_seed)
  WHERE jsonb_array_length(spicy_photos) > 0;
