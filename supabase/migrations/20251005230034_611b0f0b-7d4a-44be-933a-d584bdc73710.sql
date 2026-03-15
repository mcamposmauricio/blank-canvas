-- Add control fields to campaign_contacts table
ALTER TABLE public.campaign_contacts 
ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_id ON public.campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_email_sent ON public.campaign_contacts(email_sent);

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Users can update their campaign contacts" ON public.campaign_contacts;

CREATE POLICY "Users can update their campaign contacts" 
ON public.campaign_contacts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM campaigns
    WHERE campaigns.id = campaign_contacts.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);