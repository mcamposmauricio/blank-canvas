-- 1. Add 'nps' to trail_type enum
ALTER TYPE trail_type ADD VALUE IF NOT EXISTS 'nps';

-- 2. Add campaign_id column to trails table
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- 3. Add metadata column to trails table for storing NPS-specific data
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trails_campaign_id ON public.trails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_trails_type ON public.trails(type);

-- 5. Create trigger function to auto-create NPS trail when company is added to campaign
CREATE OR REPLACE FUNCTION public.create_nps_trail_on_campaign_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contact_user_id uuid;
  campaign_name text;
BEGIN
  -- Get user_id from contact and campaign name
  SELECT c.user_id INTO contact_user_id
  FROM contacts c
  WHERE c.id = NEW.contact_id;

  SELECT cam.name INTO campaign_name
  FROM campaigns cam
  WHERE cam.id = NEW.campaign_id;

  -- Only create if contact exists and no active NPS trail exists for this campaign
  IF contact_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM trails t 
    WHERE t.contact_id = NEW.contact_id 
    AND t.campaign_id = NEW.campaign_id 
    AND t.type = 'nps'
    AND t.status = 'active'
  ) THEN
    INSERT INTO trails (contact_id, user_id, name, type, status, campaign_id, progress_percentage, metadata)
    VALUES (
      NEW.contact_id,
      contact_user_id,
      'Acompanhamento NPS - ' || COALESCE(campaign_name, 'Campanha'),
      'nps',
      'active',
      NEW.campaign_id,
      25,
      jsonb_build_object(
        'campaign_contact_id', NEW.id,
        'added_at', now(),
        'stages', jsonb_build_object(
          'added_to_campaign', now(),
          'email_sent', null,
          'response_received', null
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Create trigger on campaign_contacts
DROP TRIGGER IF EXISTS on_campaign_contact_create_nps_trail ON public.campaign_contacts;
CREATE TRIGGER on_campaign_contact_create_nps_trail
  AFTER INSERT ON public.campaign_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_nps_trail_on_campaign_contact();

-- 7. Create function to update NPS trail when email is sent
CREATE OR REPLACE FUNCTION public.update_nps_trail_on_email_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only update if email_sent changed from false to true
  IF NEW.email_sent = true AND (OLD.email_sent = false OR OLD.email_sent IS NULL) THEN
    UPDATE trails
    SET 
      progress_percentage = 50,
      metadata = metadata || jsonb_build_object(
        'stages', COALESCE(metadata->'stages', '{}'::jsonb) || jsonb_build_object('email_sent', now())
      ),
      updated_at = now()
    WHERE contact_id = NEW.contact_id
      AND campaign_id = NEW.campaign_id
      AND type = 'nps'
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

-- 8. Create trigger for email sent
DROP TRIGGER IF EXISTS on_campaign_contact_email_sent ON public.campaign_contacts;
CREATE TRIGGER on_campaign_contact_email_sent
  AFTER UPDATE ON public.campaign_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nps_trail_on_email_sent();

-- 9. Update existing update_contact_nps_on_response function to also update NPS trail
CREATE OR REPLACE FUNCTION public.update_contact_nps_on_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update last NPS on company
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

  -- Create timeline event
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

  -- Update NPS trail to completed
  UPDATE public.trails
  SET 
    progress_percentage = 100,
    status = 'completed',
    completed_at = now(),
    metadata = metadata || jsonb_build_object(
      'score', NEW.score,
      'comment', NEW.comment,
      'classification', CASE 
        WHEN NEW.score >= 9 THEN 'promoter'
        WHEN NEW.score >= 7 THEN 'passive'
        ELSE 'detractor'
      END,
      'stages', COALESCE(metadata->'stages', '{}'::jsonb) || jsonb_build_object('response_received', now())
    ),
    updated_at = now()
  WHERE contact_id = NEW.contact_id
    AND campaign_id = NEW.campaign_id
    AND type = 'nps'
    AND status = 'active';

  RETURN NEW;
END;
$$;