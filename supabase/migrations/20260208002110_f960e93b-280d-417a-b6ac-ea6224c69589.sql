
-- ============================================
-- PHASE 1: Chat Module Database Foundation
-- ============================================

-- 1.1 Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'attendant');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1.2 Create has_role() security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 1.3 RLS for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 1.4 Alter csms table
ALTER TABLE public.csms
  ADD COLUMN IF NOT EXISTS is_chat_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_max_conversations integer DEFAULT 5;

-- 1.5 Alter company_contacts table
ALTER TABLE public.company_contacts
  ADD COLUMN IF NOT EXISTS chat_visitor_id text,
  ADD COLUMN IF NOT EXISTS chat_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chat_avg_csat numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chat_last_at timestamptz;

-- 1.6 Create chat tables

-- chat_settings
CREATE TABLE public.chat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  welcome_message text DEFAULT 'Bem-vindo ao nosso chat!',
  offline_message text DEFAULT 'Estamos offline no momento.',
  business_hours jsonb DEFAULT '{}'::jsonb,
  auto_assignment boolean DEFAULT true,
  max_queue_size integer DEFAULT 50,
  require_approval boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat settings"
  ON public.chat_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- attendant_profiles
CREATE TABLE public.attendant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  csm_id uuid NOT NULL REFERENCES public.csms(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  status text DEFAULT 'offline',
  max_conversations integer DEFAULT 5,
  active_conversations integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.attendant_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own attendant profile"
  ON public.attendant_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attendant profiles"
  ON public.attendant_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- chat_visitors
CREATE TABLE public.chat_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  company_contact_id uuid REFERENCES public.company_contacts(id),
  contact_id uuid REFERENCES public.contacts(id),
  name text NOT NULL,
  email text,
  phone text,
  role text,
  department text,
  visitor_token text UNIQUE DEFAULT gen_random_uuid()::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage visitors"
  ON public.chat_visitors FOR ALL TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Public can insert visitors"
  ON public.chat_visitors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view own visitor by token"
  ON public.chat_visitors FOR SELECT
  USING (true);

-- chat_rooms
CREATE TABLE public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  visitor_id uuid NOT NULL REFERENCES public.chat_visitors(id) ON DELETE CASCADE,
  attendant_id uuid REFERENCES public.attendant_profiles(id),
  contact_id uuid REFERENCES public.contacts(id),
  company_contact_id uuid REFERENCES public.company_contacts(id),
  status text DEFAULT 'waiting',
  priority text DEFAULT 'normal',
  started_at timestamptz DEFAULT now(),
  assigned_at timestamptz,
  closed_at timestamptz,
  csat_score integer,
  csat_comment text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage rooms"
  ON public.chat_rooms FOR ALL TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Public can insert rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view rooms"
  ON public.chat_rooms FOR SELECT
  USING (true);

CREATE POLICY "Public can update rooms"
  ON public.chat_rooms FOR UPDATE
  USING (true);

-- chat_messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  sender_id text,
  sender_name text,
  content text NOT NULL,
  message_type text DEFAULT 'text',
  is_internal boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage messages via room"
  ON public.chat_messages FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE chat_rooms.id = chat_messages.room_id
      AND chat_rooms.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE chat_rooms.id = chat_messages.room_id
      AND chat_rooms.owner_user_id = auth.uid()
  ));

CREATE POLICY "Public can insert messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view non-internal messages"
  ON public.chat_messages FOR SELECT
  USING (true);

-- chat_macros
CREATE TABLE public.chat_macros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  shortcut text,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_macros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own macros"
  ON public.chat_macros FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- chat_tags
CREATE TABLE public.chat_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tags"
  ON public.chat_tags FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- chat_room_tags
CREATE TABLE public.chat_room_tags (
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES public.chat_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, tag_id)
);

ALTER TABLE public.chat_room_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage room tags via room ownership"
  ON public.chat_room_tags FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE chat_rooms.id = chat_room_tags.room_id
      AND chat_rooms.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE chat_rooms.id = chat_room_tags.room_id
      AND chat_rooms.owner_user_id = auth.uid()
  ));

-- 1.7 Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

-- 1.8 Add new enum values to timeline_event_type
ALTER TYPE public.timeline_event_type ADD VALUE IF NOT EXISTS 'chat_opened';
ALTER TYPE public.timeline_event_type ADD VALUE IF NOT EXISTS 'chat_closed';

-- 1.9 Triggers

-- Trigger: Sync CSMs with attendant_profiles
CREATE OR REPLACE FUNCTION public.sync_csm_chat_enabled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_chat_enabled = true AND (OLD.is_chat_enabled = false OR OLD.is_chat_enabled IS NULL) THEN
    INSERT INTO public.attendant_profiles (user_id, csm_id, display_name, max_conversations)
    VALUES (NEW.user_id, NEW.id, NEW.name, COALESCE(NEW.chat_max_conversations, 5))
    ON CONFLICT DO NOTHING;
  ELSIF NEW.is_chat_enabled = false AND OLD.is_chat_enabled = true THEN
    DELETE FROM public.attendant_profiles WHERE csm_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_csm_chat_enabled
  AFTER UPDATE OF is_chat_enabled ON public.csms
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_csm_chat_enabled();

-- Trigger: Update company_contacts metrics on chat close
CREATE OR REPLACE FUNCTION public.update_company_contact_chat_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status != 'closed' AND NEW.company_contact_id IS NOT NULL THEN
    UPDATE public.company_contacts
    SET 
      chat_total = COALESCE(chat_total, 0) + 1,
      chat_last_at = now(),
      chat_avg_csat = CASE 
        WHEN NEW.csat_score IS NOT NULL THEN
          (COALESCE(chat_avg_csat, 0) * COALESCE(chat_total, 0) + NEW.csat_score) / (COALESCE(chat_total, 0) + 1)
        ELSE chat_avg_csat
      END,
      updated_at = now()
    WHERE id = NEW.company_contact_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_chat_metrics
  AFTER UPDATE OF status ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_contact_chat_metrics();

-- Trigger: Create timeline events for chat open/close
CREATE OR REPLACE FUNCTION public.create_chat_timeline_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor_name text;
  v_event_type public.timeline_event_type;
  v_title text;
BEGIN
  -- Only proceed if we have a contact_id
  IF NEW.contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_visitor_name FROM public.chat_visitors WHERE id = NEW.visitor_id;

  -- Chat opened (new room created)
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'chat_opened';
    v_title := 'Chat iniciado por ' || COALESCE(v_visitor_name, 'Visitante');
    
    INSERT INTO public.timeline_events (contact_id, user_id, type, title, description, date, user_name, metadata)
    VALUES (
      NEW.contact_id,
      NEW.owner_user_id,
      v_event_type,
      v_title,
      'Nova conversa de chat iniciada',
      now(),
      'Sistema Chat',
      jsonb_build_object('chat_room_id', NEW.id, 'visitor_name', v_visitor_name)
    );
  END IF;

  -- Chat closed
  IF TG_OP = 'UPDATE' AND NEW.status = 'closed' AND OLD.status != 'closed' THEN
    v_event_type := 'chat_closed';
    v_title := 'Chat encerrado - ' || COALESCE(v_visitor_name, 'Visitante');
    
    INSERT INTO public.timeline_events (contact_id, user_id, type, title, description, date, user_name, metadata)
    VALUES (
      NEW.contact_id,
      NEW.owner_user_id,
      v_event_type,
      v_title,
      CASE WHEN NEW.csat_score IS NOT NULL 
        THEN 'CSAT: ' || NEW.csat_score || '/5'
        ELSE 'Sem avaliação CSAT'
      END,
      now(),
      'Sistema Chat',
      jsonb_build_object('chat_room_id', NEW.id, 'visitor_name', v_visitor_name, 'csat_score', NEW.csat_score)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chat_timeline_insert
  AFTER INSERT ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.create_chat_timeline_event();

CREATE TRIGGER trg_chat_timeline_update
  AFTER UPDATE OF status ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.create_chat_timeline_event();

-- Updated_at triggers for new tables
CREATE TRIGGER update_chat_settings_updated_at
  BEFORE UPDATE ON public.chat_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendant_profiles_updated_at
  BEFORE UPDATE ON public.attendant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_macros_updated_at
  BEFORE UPDATE ON public.chat_macros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
