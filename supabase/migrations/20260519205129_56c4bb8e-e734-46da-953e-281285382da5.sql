-- Read receipts: timestamp set when the recipient views the message
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Recipient (any member of the match who is NOT the sender) can UPDATE.
CREATE POLICY "Recipients mark messages read"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = messages.match_id
      AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
  )
)
WITH CHECK (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = messages.match_id
      AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
  )
);

-- Lock down which columns can change via UPDATE: only read_at and flagged.
CREATE OR REPLACE FUNCTION public.messages_restrict_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.match_id IS DISTINCT FROM OLD.match_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only read_at/flagged may be updated on messages';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_restrict_update ON public.messages;
CREATE TRIGGER messages_restrict_update
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_restrict_update();