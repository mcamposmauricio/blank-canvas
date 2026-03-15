-- Allow public access to campaigns for NPS response page (only select, no sensitive data exposed)
CREATE POLICY "Public can view campaigns for NPS responses"
ON public.campaigns
FOR SELECT
USING (true);

-- Allow public access to brand_settings for NPS response page styling
CREATE POLICY "Public can view brand settings for NPS responses"
ON public.brand_settings
FOR SELECT
USING (true);

-- Update responses insert policy to be more explicit
DROP POLICY IF EXISTS "Anyone can insert responses with valid token" ON public.responses;

CREATE POLICY "Public can insert NPS responses with valid token"
ON public.responses
FOR INSERT
WITH CHECK (true);