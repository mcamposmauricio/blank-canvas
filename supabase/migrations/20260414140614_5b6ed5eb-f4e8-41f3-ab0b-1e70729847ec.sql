UPDATE public.chat_rooms
SET status = 'closed',
    closed_at = now(),
    resolution_status = 'archived',
    updated_at = now()
WHERE status = 'waiting'
  AND attendant_id IS NULL;