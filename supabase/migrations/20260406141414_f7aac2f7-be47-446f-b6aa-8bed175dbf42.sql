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
      PERFORM pg_advisory_xact_lock(hashtext(OLD.attendant_id::text));
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
    PERFORM pg_advisory_xact_lock(hashtext(OLD.attendant_id::text));
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
    PERFORM pg_advisory_xact_lock(hashtext(NEW.attendant_id::text));
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