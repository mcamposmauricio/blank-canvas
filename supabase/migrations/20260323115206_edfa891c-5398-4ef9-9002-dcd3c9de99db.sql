
CREATE OR REPLACE FUNCTION public.get_last_messages_for_rooms(p_room_ids uuid[])
RETURNS TABLE(room_id uuid, content text, sender_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (m.room_id)
    m.room_id,
    m.content,
    m.sender_type
  FROM chat_messages m
  WHERE m.room_id = ANY(p_room_ids)
    AND m.sender_type != 'system'
    AND m.is_internal = false
  ORDER BY m.room_id, m.created_at DESC;
$$;
