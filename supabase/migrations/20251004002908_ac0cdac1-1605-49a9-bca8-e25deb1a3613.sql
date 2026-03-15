-- Create campaign_contacts junction table for many-to-many relationship
CREATE TABLE public.campaign_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  link_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, contact_id)
);

-- Enable Row Level Security
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

-- Users can view campaign_contacts for their own campaigns
CREATE POLICY "Users can view their campaign contacts"
ON public.campaign_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_contacts.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

-- Users can insert campaign_contacts for their own campaigns
CREATE POLICY "Users can insert their campaign contacts"
ON public.campaign_contacts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_contacts.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

-- Users can delete campaign_contacts for their own campaigns
CREATE POLICY "Users can delete their campaign contacts"
ON public.campaign_contacts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_contacts.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX idx_campaign_contacts_campaign_id ON public.campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_contact_id ON public.campaign_contacts(contact_id);