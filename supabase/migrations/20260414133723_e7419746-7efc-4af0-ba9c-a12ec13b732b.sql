UPDATE public.chat_rooms
SET status = 'closed',
    closed_at = now(),
    resolution_status = 'archived',
    updated_at = now()
WHERE id = '47e10e35-5815-4997-851f-4bf880810ebb'
  AND status = 'waiting';