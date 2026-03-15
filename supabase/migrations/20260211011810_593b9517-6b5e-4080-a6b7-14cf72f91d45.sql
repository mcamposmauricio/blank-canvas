
-- Table to track when users last read a chat room
CREATE TABLE public.chat_room_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE public.chat_room_reads ENABLE ROW LEVEL SECURITY;

-- Users can manage their own read markers
CREATE POLICY "Users can manage own reads"
ON public.chat_room_reads
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
