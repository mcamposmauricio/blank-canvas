
-- Drop and recreate all RLS policies as PERMISSIVE to allow public access

-- Campaign Contacts
DROP POLICY IF EXISTS "Public can view campaign contacts for NPS responses" ON campaign_contacts;
DROP POLICY IF EXISTS "Users can view their campaign contacts" ON campaign_contacts;
DROP POLICY IF EXISTS "Users can insert their campaign contacts" ON campaign_contacts;
DROP POLICY IF EXISTS "Users can update their campaign contacts" ON campaign_contacts;
DROP POLICY IF EXISTS "Users can delete their campaign contacts" ON campaign_contacts;

CREATE POLICY "Public can view campaign contacts for NPS responses" 
ON campaign_contacts FOR SELECT 
TO public
USING (true);

CREATE POLICY "Users can view their campaign contacts" 
ON campaign_contacts FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_contacts.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their campaign contacts" 
ON campaign_contacts FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_contacts.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their campaign contacts" 
ON campaign_contacts FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_contacts.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their campaign contacts" 
ON campaign_contacts FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_contacts.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Campaigns
DROP POLICY IF EXISTS "Public can view campaigns for NPS responses" ON campaigns;
DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON campaigns;

CREATE POLICY "Public can view campaigns for NPS responses" 
ON campaigns FOR SELECT 
TO public
USING (true);

CREATE POLICY "Users can view their own campaigns" 
ON campaigns FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" 
ON campaigns FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" 
ON campaigns FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" 
ON campaigns FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Contacts
DROP POLICY IF EXISTS "Public can view contacts for NPS responses" ON contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;

CREATE POLICY "Public can view contacts for NPS responses" 
ON contacts FOR SELECT 
TO public
USING (true);

CREATE POLICY "Users can view their own contacts" 
ON contacts FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" 
ON contacts FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
ON contacts FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
ON contacts FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Brand Settings
DROP POLICY IF EXISTS "Public can view brand settings for NPS responses" ON brand_settings;
DROP POLICY IF EXISTS "Users can view their own brand settings" ON brand_settings;
DROP POLICY IF EXISTS "Users can insert their own brand settings" ON brand_settings;
DROP POLICY IF EXISTS "Users can update their own brand settings" ON brand_settings;
DROP POLICY IF EXISTS "Users can delete their own brand settings" ON brand_settings;

CREATE POLICY "Public can view brand settings for NPS responses" 
ON brand_settings FOR SELECT 
TO public
USING (true);

CREATE POLICY "Users can view their own brand settings" 
ON brand_settings FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand settings" 
ON brand_settings FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand settings" 
ON brand_settings FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand settings" 
ON brand_settings FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Responses (already has public insert)
DROP POLICY IF EXISTS "Public can insert NPS responses with valid token" ON responses;
DROP POLICY IF EXISTS "Users can view responses from their campaigns" ON responses;

CREATE POLICY "Public can insert NPS responses with valid token" 
ON responses FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Users can view responses from their campaigns" 
ON responses FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = responses.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);
