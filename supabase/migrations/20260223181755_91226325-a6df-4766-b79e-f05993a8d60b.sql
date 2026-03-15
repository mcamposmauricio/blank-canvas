
-- contacts
DROP POLICY IF EXISTS "Public can view contacts for NPS responses" ON contacts;
CREATE POLICY "Anon can view contacts for NPS responses"
  ON contacts FOR SELECT TO anon USING (true);

-- campaigns
DROP POLICY IF EXISTS "Public can view campaigns for NPS responses" ON campaigns;
CREATE POLICY "Anon can view campaigns for NPS responses"
  ON campaigns FOR SELECT TO anon USING (true);

-- campaign_contacts
DROP POLICY IF EXISTS "Public can view campaign contacts for NPS responses" ON campaign_contacts;
CREATE POLICY "Anon can view campaign contacts for NPS responses"
  ON campaign_contacts FOR SELECT TO anon USING (true);

-- company_contacts
DROP POLICY IF EXISTS "Public can view company contacts for NPS" ON company_contacts;
CREATE POLICY "Anon can view company contacts for NPS"
  ON company_contacts FOR SELECT TO anon USING (true);

-- brand_settings
DROP POLICY IF EXISTS "Public can view brand settings for NPS responses" ON brand_settings;
CREATE POLICY "Anon can view brand settings for NPS responses"
  ON brand_settings FOR SELECT TO anon USING (true);

-- chat_rooms (SELECT)
DROP POLICY IF EXISTS "Public can view rooms" ON chat_rooms;
CREATE POLICY "Anon can view rooms"
  ON chat_rooms FOR SELECT TO anon USING (true);

-- chat_rooms (UPDATE)
DROP POLICY IF EXISTS "Public can update rooms" ON chat_rooms;
CREATE POLICY "Anon can update rooms"
  ON chat_rooms FOR UPDATE TO anon USING (true);

-- chat_messages
DROP POLICY IF EXISTS "Public can view non-internal messages" ON chat_messages;
CREATE POLICY "Anon can view non-internal messages"
  ON chat_messages FOR SELECT TO anon USING (true);

-- chat_visitors
DROP POLICY IF EXISTS "Public can view own visitor by token" ON chat_visitors;
CREATE POLICY "Anon can view own visitor by token"
  ON chat_visitors FOR SELECT TO anon USING (true);

-- chat_settings
DROP POLICY IF EXISTS "Public can read chat widget config" ON chat_settings;
CREATE POLICY "Anon can read chat widget config"
  ON chat_settings FOR SELECT TO anon USING (true);

-- chat_banner_assignments
DROP POLICY IF EXISTS "Public can update assignment votes" ON chat_banner_assignments;
CREATE POLICY "Anon can update assignment votes"
  ON chat_banner_assignments FOR UPDATE TO anon USING (true) WITH CHECK (true);
