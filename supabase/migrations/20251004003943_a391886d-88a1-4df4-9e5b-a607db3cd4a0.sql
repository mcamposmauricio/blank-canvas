-- Allow public access to campaign_contacts for NPS response validation
CREATE POLICY "Public can view campaign contacts for NPS responses"
ON public.campaign_contacts
FOR SELECT
USING (true);

-- Allow public access to contacts for NPS response page (only minimal data needed)
CREATE POLICY "Public can view contacts for NPS responses"
ON public.contacts
FOR SELECT
USING (true);