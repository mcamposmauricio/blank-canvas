-- Add new fields to campaigns table for automatic campaigns
ALTER TABLE public.campaigns
ADD COLUMN campaign_type text NOT NULL DEFAULT 'manual' CHECK (campaign_type IN ('manual', 'automatic')),
ADD COLUMN start_date timestamp with time zone,
ADD COLUMN cycle_type text CHECK (cycle_type IN ('weekly', 'biweekly')),
ADD COLUMN attempts_total integer,
ADD COLUMN attempt_current integer DEFAULT 0,
ADD COLUMN next_send timestamp with time zone;

-- Update status column to include new statuses
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('draft', 'scheduled', 'live', 'paused', 'completed'));

-- Create campaign_sends table to track individual sends
CREATE TABLE public.campaign_sends (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  attempt integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamp with time zone,
  response_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, contact_id, attempt)
);

-- Enable RLS on campaign_sends
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaign_sends
CREATE POLICY "Users can view their campaign sends"
ON public.campaign_sends
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_sends.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their campaign sends"
ON public.campaign_sends
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_sends.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their campaign sends"
ON public.campaign_sends
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_sends.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

-- Create index for efficient cron queries
CREATE INDEX idx_campaigns_next_send ON public.campaigns(next_send) WHERE campaign_type = 'automatic' AND status IN ('scheduled', 'live');

-- Create index for campaign_sends lookups
CREATE INDEX idx_campaign_sends_campaign_contact ON public.campaign_sends(campaign_id, contact_id);

-- Add trigger to update campaign status when response is received
CREATE OR REPLACE FUNCTION public.update_campaign_send_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign_sends when a response is received
  UPDATE public.campaign_sends
  SET response_at = NEW.responded_at
  WHERE campaign_id = NEW.campaign_id
  AND contact_id = NEW.contact_id
  AND response_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_response_received
AFTER INSERT ON public.responses
FOR EACH ROW
EXECUTE FUNCTION public.update_campaign_send_response();