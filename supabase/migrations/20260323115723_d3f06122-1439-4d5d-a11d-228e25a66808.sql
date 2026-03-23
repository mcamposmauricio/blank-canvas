
-- Function: get first attendant response per room (1 row per room instead of thousands)
CREATE OR REPLACE FUNCTION public.get_first_response_times(p_room_ids uuid[])
RETURNS TABLE(room_id uuid, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (m.room_id)
    m.room_id,
    m.created_at
  FROM chat_messages m
  WHERE m.room_id = ANY(p_room_ids)
    AND m.sender_type = 'attendant'
  ORDER BY m.room_id, m.created_at ASC;
$$;
