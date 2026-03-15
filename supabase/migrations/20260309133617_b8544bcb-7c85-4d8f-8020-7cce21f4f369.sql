
-- 1. Create composite index for fast COUNT on active rooms per attendant
CREATE INDEX IF NOT EXISTS idx_chat_rooms_attendant_status 
ON public.chat_rooms(attendant_id, status) WHERE status IN ('active', 'waiting');

-- 2. Replace incremental trigger with COUNT-based resync
CREATE OR REPLACE FUNCTION public.resync_attendant_counter_on_room_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- On DELETE, only OLD exists
  IF TG_OP = 'DELETE' THEN
    IF OLD.attendant_id IS NOT NULL AND OLD.status IN ('active', 'waiting') THEN
      UPDATE public.attendant_profiles
      SET active_conversations = (
        SELECT COUNT(*) FROM public.chat_rooms
        WHERE attendant_id = OLD.attendant_id AND status IN ('active', 'waiting')
      ), updated_at = now()
      WHERE id = OLD.attendant_id;
    END IF;
    RETURN OLD;
  END IF;

  -- On INSERT or UPDATE: resync OLD attendant (if changed or room closed)
  IF TG_OP = 'UPDATE' AND OLD.attendant_id IS NOT NULL THEN
    UPDATE public.attendant_profiles
    SET active_conversations = (
      SELECT COUNT(*) FROM public.chat_rooms
      WHERE attendant_id = OLD.attendant_id AND status IN ('active', 'waiting')
    ), updated_at = now()
    WHERE id = OLD.attendant_id;
  END IF;

  -- Resync NEW attendant (if different from OLD or on INSERT)
  IF NEW.attendant_id IS NOT NULL 
     AND (TG_OP = 'INSERT' OR NEW.attendant_id IS DISTINCT FROM OLD.attendant_id OR NEW.status IS DISTINCT FROM OLD.status) THEN
    UPDATE public.attendant_profiles
    SET active_conversations = (
      SELECT COUNT(*) FROM public.chat_rooms
      WHERE attendant_id = NEW.attendant_id AND status IN ('active', 'waiting')
    ), updated_at = now()
    WHERE id = NEW.attendant_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Drop old incremental triggers
DROP TRIGGER IF EXISTS trg_decrement_attendant ON public.chat_rooms;
DROP TRIGGER IF EXISTS trg_decrement_on_room_delete ON public.chat_rooms;

-- 4. Create new COUNT-based trigger (AFTER to see committed state)
CREATE TRIGGER trg_resync_attendant_counter
AFTER INSERT OR UPDATE OR DELETE ON public.chat_rooms
FOR EACH ROW
EXECUTE FUNCTION public.resync_attendant_counter_on_room_change();

-- 5. Also update the assign_chat_room function's inline increment to let the trigger handle it
-- The assign_chat_room trigger runs BEFORE INSERT and does its own +1.
-- Since our new trigger is AFTER, the assign_chat_room increment will be overwritten by the COUNT.
-- This is fine - the COUNT will be accurate.

-- 6. One-time resync all attendant counters to correct current drift
UPDATE public.attendant_profiles ap
SET active_conversations = (
  SELECT COUNT(*) FROM public.chat_rooms cr
  WHERE cr.attendant_id = ap.id AND cr.status IN ('active', 'waiting')
), updated_at = now();
