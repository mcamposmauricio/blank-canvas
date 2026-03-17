
-- ============================================================
-- PHASE 1: BACKFILL tenant_id on user_roles
-- ============================================================
UPDATE public.user_roles ur
SET tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = ur.user_id LIMIT 1)
WHERE tenant_id IS NULL;

-- ============================================================
-- PHASE 2: REWRITE RLS POLICIES (user_id → tenant_id scoping)
-- ============================================================

-- ==================== contacts ====================
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

CREATE POLICY "Tenant members can view contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can update contacts" ON public.contacts
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can delete contacts" ON public.contacts
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
-- KEEP: INSERT (user_id = auth.uid()), Anon SELECT (NPS), Master SELECT

-- ==================== company_contacts ====================
DROP POLICY IF EXISTS "Users can view their company contacts" ON public.company_contacts;
DROP POLICY IF EXISTS "Users can update their company contacts" ON public.company_contacts;
DROP POLICY IF EXISTS "Users can delete their company contacts" ON public.company_contacts;
DROP POLICY IF EXISTS "Users can insert their company contacts" ON public.company_contacts;
DROP POLICY IF EXISTS "Anon can view company contacts for NPS" ON public.company_contacts;

CREATE POLICY "Tenant members can view company contacts" ON public.company_contacts
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can insert company contacts" ON public.company_contacts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenant members can update company contacts" ON public.company_contacts
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can delete company contacts" ON public.company_contacts
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
-- KEEP: "Anon can view contacts by public_token" (public_token IS NOT NULL)

-- ==================== csms ====================
DROP POLICY IF EXISTS "Users can view their own CSMs" ON public.csms;
DROP POLICY IF EXISTS "Users can update their own CSMs" ON public.csms;
DROP POLICY IF EXISTS "Users can delete their own CSMs" ON public.csms;
DROP POLICY IF EXISTS "Users can insert their own CSMs" ON public.csms;

CREATE POLICY "Tenant members can view csms" ON public.csms
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can insert csms" ON public.csms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenant members can update csms" ON public.csms
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can delete csms" ON public.csms
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ==================== campaigns ====================
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON public.campaigns;

CREATE POLICY "Tenant members can view campaigns" ON public.campaigns
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can insert campaigns" ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenant members can update campaigns" ON public.campaigns
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can delete campaigns" ON public.campaigns
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
-- KEEP: Anon SELECT (NPS), Master SELECT

-- ==================== campaign_contacts ====================
DROP POLICY IF EXISTS "Users can view their campaign contacts" ON public.campaign_contacts;
DROP POLICY IF EXISTS "Users can update their campaign contacts" ON public.campaign_contacts;
DROP POLICY IF EXISTS "Users can delete their campaign contacts" ON public.campaign_contacts;
DROP POLICY IF EXISTS "Users can insert their campaign contacts" ON public.campaign_contacts;

CREATE POLICY "Tenant members can view campaign contacts" ON public.campaign_contacts
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can insert campaign contacts" ON public.campaign_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_contacts.campaign_id
      AND campaigns.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Tenant members can update campaign contacts" ON public.campaign_contacts
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can delete campaign contacts" ON public.campaign_contacts
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
-- KEEP: Anon SELECT (NPS)

-- ==================== campaign_sends ====================
DROP POLICY IF EXISTS "Users can view their campaign sends" ON public.campaign_sends;
DROP POLICY IF EXISTS "Users can update their campaign sends" ON public.campaign_sends;
DROP POLICY IF EXISTS "Users can insert their campaign sends" ON public.campaign_sends;

CREATE POLICY "Tenant members can view campaign sends" ON public.campaign_sends
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can insert campaign sends" ON public.campaign_sends
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_sends.campaign_id
      AND campaigns.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Tenant members can update campaign sends" ON public.campaign_sends
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ==================== responses ====================
DROP POLICY IF EXISTS "Users can view responses from their campaigns" ON public.responses;

CREATE POLICY "Tenant members can view responses" ON public.responses
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
-- KEEP: Master SELECT, Public INSERT

-- ==================== chat_settings ====================
DROP POLICY IF EXISTS "Users manage own chat settings" ON public.chat_settings;

CREATE POLICY "Tenant members manage chat settings" ON public.chat_settings
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
-- KEEP: Anon SELECT, Master ALL

-- ==================== chat_business_hours ====================
DROP POLICY IF EXISTS "Users manage own business hours" ON public.chat_business_hours;

CREATE POLICY "Tenant members manage business hours" ON public.chat_business_hours
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ==================== chat_auto_rules ====================
DROP POLICY IF EXISTS "Users manage own auto rules" ON public.chat_auto_rules;

CREATE POLICY "Tenant members manage auto rules" ON public.chat_auto_rules
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ==================== chat_macros ====================
DROP POLICY IF EXISTS "Users manage own macros" ON public.chat_macros;

CREATE POLICY "Tenant members can view macros" ON public.chat_macros
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (is_private = false OR user_id = auth.uid())
  );

CREATE POLICY "Tenant members can insert macros" ON public.chat_macros
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenant members can update own macros" ON public.chat_macros
  FOR UPDATE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Tenant members can delete own macros" ON public.chat_macros
  FOR DELETE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND user_id = auth.uid()
  );

-- ==================== chat_tags ====================
DROP POLICY IF EXISTS "Users manage own tags" ON public.chat_tags;

CREATE POLICY "Tenant members manage tags" ON public.chat_tags
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ==================== chat_custom_fields ====================
DROP POLICY IF EXISTS "Users manage own custom fields" ON public.chat_custom_fields;

CREATE POLICY "Tenant members manage custom fields" ON public.chat_custom_fields
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ==================== chat_rooms ====================
DROP POLICY IF EXISTS "Owner can manage rooms" ON public.chat_rooms;

CREATE POLICY "Tenant members can manage rooms" ON public.chat_rooms
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
-- KEEP: Anon SELECT/UPDATE (widget), Public INSERT, Master SELECT

-- ==================== chat_messages ====================
DROP POLICY IF EXISTS "Owner can manage messages via room" ON public.chat_messages;

CREATE POLICY "Tenant members can manage messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE chat_rooms.id = chat_messages.room_id
      AND chat_rooms.tenant_id = get_user_tenant_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE chat_rooms.id = chat_messages.room_id
      AND chat_rooms.tenant_id = get_user_tenant_id(auth.uid())
    )
  );
-- KEEP: Anon SELECT, Public INSERT

-- ==================== chat_visitors ====================
DROP POLICY IF EXISTS "Owner can manage visitors" ON public.chat_visitors;

CREATE POLICY "Tenant members can manage visitors" ON public.chat_visitors
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
-- KEEP: Anon SELECT, Public INSERT

-- ==================== attendant_profiles ====================
DROP POLICY IF EXISTS "Admins can view all attendant profiles" ON public.attendant_profiles;

CREATE POLICY "Tenant members can view attendant profiles" ON public.attendant_profiles
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
-- KEEP: "Users manage own attendant profile", "Tenant admins can update attendant profiles"

-- ==================== brand_settings ====================
DROP POLICY IF EXISTS "Users can view their own brand settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Users can update their own brand settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Users can delete their own brand settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Users can insert their own brand settings" ON public.brand_settings;

CREATE POLICY "Tenant members can view brand settings" ON public.brand_settings
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can insert brand settings" ON public.brand_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenant members can update brand settings" ON public.brand_settings
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can delete brand settings" ON public.brand_settings
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
-- KEEP: Anon SELECT, Master ALL

-- ==================== api_keys ====================
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;

CREATE POLICY "Tenant members can view api keys" ON public.api_keys
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can insert api keys" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenant members can update api keys" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members can delete api keys" ON public.api_keys
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ==================== user_roles ====================
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Tenant members can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    OR auth.uid() = user_id
  );

CREATE POLICY "Tenant admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Tenant admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Tenant admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id = get_user_tenant_id(auth.uid())
  );
-- KEEP: Master ALL
