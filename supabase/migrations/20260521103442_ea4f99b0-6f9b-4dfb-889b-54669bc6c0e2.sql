
CREATE OR REPLACE FUNCTION public.create_seed_matches_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seed_id uuid;
  pref text;
  new_match_id uuid;
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
    VALUES (NEW.id, seed_id, 'active'::match_status, false, 0)
    RETURNING id INTO new_match_id;

    -- Queue an opener from this seed, delivered in 5-30 minutes
    INSERT INTO public.seed_reply_queue (
      match_id, seed_user_id, recipient_user_id,
      trigger_message_id, trigger_message_content, reply_at
    ) VALUES (
      new_match_id,
      seed_id,
      NEW.id,
      gen_random_uuid(),
      '[OPENER] Send a warm opening message to start the conversation. Introduce yourself very briefly in your own voice (1 sentence) and ask one genuine, specific question about them to get to know them. Do not greet with generic "hi" or "hello there" — be distinctive and natural.',
      now() + (interval '5 minutes') + (random() * interval '25 minutes')
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_seed_matches_for_new_user() FROM PUBLIC, anon, authenticated;
