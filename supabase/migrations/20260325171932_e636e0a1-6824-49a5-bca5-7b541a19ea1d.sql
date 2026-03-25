
-- 1. Trigger to update chat_rooms.updated_at when a new message is inserted
CREATE OR REPLACE FUNCTION public.update_room_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.chat_rooms
  SET updated_at = now()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_room_on_message ON public.chat_messages;

CREATE TRIGGER trg_update_room_on_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_room_on_new_message();

-- 2. Drop and recreate get_last_messages_for_rooms with created_at
DROP FUNCTION IF EXISTS public.get_last_messages_for_rooms(uuid[]);

CREATE FUNCTION public.get_last_messages_for_rooms(p_room_ids uuid[])
RETURNS TABLE(room_id uuid, content text, sender_type text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (m.room_id)
    m.room_id, m.content, m.sender_type, m.created_at
  FROM chat_messages m
  WHERE m.room_id = ANY(p_room_ids)
    AND m.sender_type != 'system'
    AND m.is_internal = false
  ORDER BY m.room_id, m.created_at DESC;
$$;
