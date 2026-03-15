-- =====================================================
-- FASE 1: TIPOS ENUM E TABELA DE CSMs
-- =====================================================

-- 1.1 Criar tipos ENUM
CREATE TYPE trail_type AS ENUM ('default', 'overdue', 'attention');
CREATE TYPE timeline_event_type AS ENUM ('meeting', 'email', 'call', 'contract', 'payment', 'activity', 'nps_response');

-- 1.2 Criar tabela de CSMs (Customer Success Managers)
CREATE TABLE public.csms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  department text,
  hire_date date,
  specialty text[] DEFAULT ARRAY['implementacao']::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS para csms
ALTER TABLE public.csms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own CSMs" ON public.csms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CSMs" ON public.csms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CSMs" ON public.csms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CSMs" ON public.csms
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at para csms
CREATE TRIGGER update_csms_updated_at
  BEFORE UPDATE ON public.csms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 1.3 ADICIONAR CAMPOS CS NA TABELA CONTACTS
-- =====================================================

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS cs_status text DEFAULT 'implementacao';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS health_score integer DEFAULT 50;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS mrr numeric DEFAULT 0;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS contract_value numeric DEFAULT 0;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS renewal_date date;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS csm_id uuid REFERENCES public.csms(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_nps_score integer;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_nps_date timestamptz;

-- =====================================================
-- 1.4 TABELA TRAIL_TEMPLATES
-- =====================================================

CREATE TABLE public.trail_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  type trail_type DEFAULT 'default',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.trail_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trail templates" ON public.trail_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trail templates" ON public.trail_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trail templates" ON public.trail_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trail templates" ON public.trail_templates
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_trail_templates_updated_at
  BEFORE UPDATE ON public.trail_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 1.5 TABELA TRAIL_TEMPLATE_ACTIVITIES
-- =====================================================

CREATE TABLE public.trail_template_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_template_id uuid REFERENCES public.trail_templates(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  is_required boolean DEFAULT true,
  estimated_days integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.trail_template_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage activities of their templates" ON public.trail_template_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trail_templates 
      WHERE trail_templates.id = trail_template_activities.trail_template_id 
      AND trail_templates.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_trail_template_activities_updated_at
  BEFORE UPDATE ON public.trail_template_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 1.6 TABELA TRAILS (instâncias aplicadas a empresas)
-- =====================================================

CREATE TABLE public.trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  trail_template_id uuid REFERENCES public.trail_templates(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  type trail_type DEFAULT 'default',
  status text DEFAULT 'active',
  progress_percentage integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trails" ON public.trails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trails" ON public.trails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trails" ON public.trails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trails" ON public.trails
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_trails_updated_at
  BEFORE UPDATE ON public.trails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 1.7 TABELA TRAIL_ACTIVITY_LOGS
-- =====================================================

CREATE TABLE public.trail_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id uuid REFERENCES public.trails(id) ON DELETE CASCADE NOT NULL,
  trail_template_activity_id uuid REFERENCES public.trail_template_activities(id) NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) NOT NULL,
  completed_by text,
  completed_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.trail_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own activity logs" ON public.trail_activity_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trails 
      WHERE trails.id = trail_activity_logs.trail_id 
      AND trails.user_id = auth.uid()
    )
  );

-- =====================================================
-- 1.8 TABELA TIMELINE_EVENTS
-- =====================================================

CREATE TABLE public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  type timeline_event_type NOT NULL,
  title text NOT NULL,
  description text,
  date timestamptz NOT NULL,
  user_name text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own timeline events" ON public.timeline_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline events" ON public.timeline_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline events" ON public.timeline_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline events" ON public.timeline_events
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FASE 2: TRIGGERS DE INTEGRAÇÃO NPS
-- =====================================================

-- 2.1 Trigger para atualizar NPS no contact e criar evento na timeline
CREATE OR REPLACE FUNCTION public.update_contact_nps_on_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar último NPS na empresa
  UPDATE public.contacts
  SET 
    last_nps_score = NEW.score,
    last_nps_date = NEW.responded_at,
    health_score = CASE
      WHEN NEW.score >= 9 THEN LEAST(COALESCE(health_score, 50) + 10, 100)
      WHEN NEW.score >= 7 THEN COALESCE(health_score, 50)
      ELSE GREATEST(COALESCE(health_score, 50) - 10, 0)
    END,
    updated_at = now()
  WHERE id = NEW.contact_id;

  -- Criar evento na timeline
  INSERT INTO public.timeline_events (contact_id, user_id, type, title, description, date, user_name, metadata)
  SELECT 
    NEW.contact_id,
    c.user_id,
    'nps_response',
    CASE 
      WHEN NEW.score >= 9 THEN 'NPS: Promotor (' || NEW.score || ')'
      WHEN NEW.score >= 7 THEN 'NPS: Neutro (' || NEW.score || ')'
      ELSE 'NPS: Detrator (' || NEW.score || ')'
    END,
    COALESCE(NEW.comment, 'Sem comentário'),
    COALESCE(NEW.responded_at, now()),
    'Sistema NPS',
    jsonb_build_object('score', NEW.score, 'campaign_id', NEW.campaign_id)
  FROM public.contacts c
  WHERE c.id = NEW.contact_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_nps_response_update_contact
  AFTER INSERT ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.update_contact_nps_on_response();

-- 2.2 Trigger para criar trilha de recuperação para detratores
CREATE OR REPLACE FUNCTION public.create_recovery_trail_for_detractor()
RETURNS TRIGGER AS $$
DECLARE
  recovery_template_id uuid;
  contact_user_id uuid;
BEGIN
  -- Só para detratores (score 0-6)
  IF NEW.score > 6 THEN
    RETURN NEW;
  END IF;

  -- Buscar user_id do contact
  SELECT user_id INTO contact_user_id
  FROM public.contacts
  WHERE id = NEW.contact_id;

  -- Buscar template de recuperação ativo
  SELECT id INTO recovery_template_id
  FROM public.trail_templates
  WHERE type = 'attention' 
    AND is_active = true
    AND user_id = contact_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Se existe template, criar trilha
  IF recovery_template_id IS NOT NULL THEN
    INSERT INTO public.trails (contact_id, trail_template_id, user_id, name, type, status)
    VALUES (
      NEW.contact_id,
      recovery_template_id,
      contact_user_id,
      'Recuperação NPS - ' || to_char(now(), 'DD/MM/YYYY'),
      'attention',
      'active'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_detractor_create_recovery_trail
  AFTER INSERT ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.create_recovery_trail_for_detractor();