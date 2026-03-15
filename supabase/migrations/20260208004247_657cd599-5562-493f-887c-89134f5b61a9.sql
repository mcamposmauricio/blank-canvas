
-- 1. Add resolution_status to chat_rooms
ALTER TABLE public.chat_rooms 
ADD COLUMN IF NOT EXISTS resolution_status text DEFAULT 'pending';

-- 2. Add public_token to company_contacts
ALTER TABLE public.company_contacts 
ADD COLUMN IF NOT EXISTS public_token text DEFAULT (gen_random_uuid())::text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_contacts_public_token 
ON company_contacts(public_token);

-- 3. Create chat_business_hours table
CREATE TABLE IF NOT EXISTS public.chat_business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time text DEFAULT '08:00',
  end_time text DEFAULT '18:00',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

ALTER TABLE public.chat_business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own business hours"
ON public.chat_business_hours FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Create chat_auto_rules table
CREATE TABLE IF NOT EXISTS public.chat_auto_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  trigger_minutes integer,
  message_content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_auto_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own auto rules"
ON public.chat_auto_rules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Create chat_custom_fields table
CREATE TABLE IF NOT EXISTS public.chat_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  label text NOT NULL,
  field_type text DEFAULT 'text',
  placeholder text,
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own custom fields"
ON public.chat_custom_fields FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_closed_at 
  ON chat_rooms(closed_at DESC) WHERE status = 'closed';
CREATE INDEX IF NOT EXISTS idx_chat_rooms_status 
  ON chat_rooms(status);
CREATE INDEX IF NOT EXISTS idx_chat_room_tags_room_id 
  ON chat_room_tags(room_id);

-- 7. RLS policy for public portal access on company_contacts (by public_token)
CREATE POLICY "Public can view contacts by public_token"
ON public.company_contacts FOR SELECT
USING (public_token IS NOT NULL);
