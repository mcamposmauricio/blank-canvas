
-- 1. Resync all attendant counters to real room counts
UPDATE public.attendant_profiles ap
SET active_conversations = COALESCE(sub.real_count, 0),
    updated_at = now()
FROM (
  SELECT cr.attendant_id, COUNT(*) AS real_count
  FROM public.chat_rooms cr
  WHERE cr.status IN ('active', 'waiting')
    AND cr.attendant_id IS NOT NULL
  GROUP BY cr.attendant_id
) sub
WHERE ap.id = sub.attendant_id;

-- Also zero out attendants with no active rooms
UPDATE public.attendant_profiles
SET active_conversations = 0, updated_at = now()
WHERE id NOT IN (
  SELECT DISTINCT attendant_id FROM public.chat_rooms
  WHERE status IN ('active', 'waiting') AND attendant_id IS NOT NULL
)
AND COALESCE(active_conversations, 0) > 0;

-- 2. Replace decrement function to handle both reassignment and close
CREATE OR REPLACE FUNCTION public.decrement_attendant_active_conversations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Case 1: Room closed — decrement the current attendant (NEW.attendant_id)
  IF NEW.status = 'closed'
     AND OLD.status IS DISTINCT FROM 'closed'
     AND NEW.attendant_id IS NOT NULL
  THEN
    UPDATE public.attendant_profiles
    SET active_conversations = GREATEST(0, COALESCE(active_conversations, 0) - 1),
        updated_at = now()
    WHERE id = NEW.attendant_id;
    RETURN NEW;
  END IF;

  -- Case 2: Reassignment on non-closed room
  IF NEW.status IS DISTINCT FROM 'closed'
     AND OLD.attendant_id IS DISTINCT FROM NEW.attendant_id
  THEN
    -- Decrement old attendant
    IF OLD.attendant_id IS NOT NULL THEN
      UPDATE public.attendant_profiles
      SET active_conversations = GREATEST(0, COALESCE(active_conversations, 0) - 1),
          updated_at = now()
      WHERE id = OLD.attendant_id;
    END IF;

    -- Increment new attendant
    IF NEW.attendant_id IS NOT NULL THEN
      UPDATE public.attendant_profiles
      SET active_conversations = COALESCE(active_conversations, 0) + 1,
          updated_at = now()
      WHERE id = NEW.attendant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
