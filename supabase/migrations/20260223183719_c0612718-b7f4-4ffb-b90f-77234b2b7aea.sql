DROP POLICY "Public can view contacts by public_token" ON company_contacts;
CREATE POLICY "Anon can view contacts by public_token"
  ON company_contacts FOR SELECT TO anon
  USING (public_token IS NOT NULL);