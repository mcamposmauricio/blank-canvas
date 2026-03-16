
-- ═══════════════════════════════════════════
-- MIGRATION: Create missing function + all 55 triggers
-- ═══════════════════════════════════════════

-- 1. Create missing function set_tenant_id_from_owner
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.owner_user_id IS NOT NULL 
     AND NEW.owner_user_id != '00000000-0000-0000-0000-000000000000' THEN
    NEW.tenant_id := (SELECT tenant_id FROM public.user_profiles WHERE user_id = NEW.owner_user_id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

-- 2. ALL 55 TRIGGERS (idempotent with DROP IF EXISTS)

-- api_keys (2)
DROP TRIGGER IF EXISTS auto_set_tenant_api_keys ON public.api_keys;
CREATE TRIGGER auto_set_tenant_api_keys BEFORE INSERT ON public.api_keys FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- attendant_profiles (2)
DROP TRIGGER IF EXISTS auto_set_tenant_attendant_profiles ON public.attendant_profiles;
CREATE TRIGGER auto_set_tenant_attendant_profiles BEFORE INSERT ON public.attendant_profiles FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_attendant_profiles_updated_at ON public.attendant_profiles;
CREATE TRIGGER update_attendant_profiles_updated_at BEFORE UPDATE ON public.attendant_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- brand_settings (2)
DROP TRIGGER IF EXISTS auto_set_tenant_brand_settings ON public.brand_settings;
CREATE TRIGGER auto_set_tenant_brand_settings BEFORE INSERT ON public.brand_settings FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_brand_settings_updated_at ON public.brand_settings;
CREATE TRIGGER update_brand_settings_updated_at BEFORE UPDATE ON public.brand_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- campaign_contacts (2)
DROP TRIGGER IF EXISTS on_campaign_contact_create_nps_trail ON public.campaign_contacts;
CREATE TRIGGER on_campaign_contact_create_nps_trail AFTER INSERT ON public.campaign_contacts FOR EACH ROW EXECUTE FUNCTION create_nps_trail_on_campaign_contact();
DROP TRIGGER IF EXISTS on_campaign_contact_email_sent ON public.campaign_contacts;
CREATE TRIGGER on_campaign_contact_email_sent AFTER UPDATE ON public.campaign_contacts FOR EACH ROW EXECUTE FUNCTION update_nps_trail_on_email_sent();

-- campaigns (1)
DROP TRIGGER IF EXISTS auto_set_tenant_campaigns ON public.campaigns;
CREATE TRIGGER auto_set_tenant_campaigns BEFORE INSERT ON public.campaigns FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

-- chat_assignment_configs (1)
DROP TRIGGER IF EXISTS update_chat_assignment_configs_updated_at ON public.chat_assignment_configs;
CREATE TRIGGER update_chat_assignment_configs_updated_at BEFORE UPDATE ON public.chat_assignment_configs FOR EACH ROW EXECUTE FUNCTION update_chat_assignment_configs_updated_at();

-- chat_auto_rules (1)
DROP TRIGGER IF EXISTS auto_set_tenant_chat_auto_rules ON public.chat_auto_rules;
CREATE TRIGGER auto_set_tenant_chat_auto_rules BEFORE INSERT ON public.chat_auto_rules FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

-- chat_banner_field_rules (1)
DROP TRIGGER IF EXISTS set_tenant_id_from_banner_trigger ON public.chat_banner_field_rules;
CREATE TRIGGER set_tenant_id_from_banner_trigger BEFORE INSERT ON public.chat_banner_field_rules FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_banner();

-- chat_banners (2)
DROP TRIGGER IF EXISTS set_chat_banners_tenant_id ON public.chat_banners;
CREATE TRIGGER set_chat_banners_tenant_id BEFORE INSERT ON public.chat_banners FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_chat_banners_updated_at ON public.chat_banners;
CREATE TRIGGER update_chat_banners_updated_at BEFORE UPDATE ON public.chat_banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- chat_broadcasts (2)
DROP TRIGGER IF EXISTS set_broadcast_tenant_id ON public.chat_broadcasts;
CREATE TRIGGER set_broadcast_tenant_id BEFORE INSERT ON public.chat_broadcasts FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_broadcasts_updated_at ON public.chat_broadcasts;
CREATE TRIGGER update_broadcasts_updated_at BEFORE UPDATE ON public.chat_broadcasts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- chat_business_hour_breaks (1)
DROP TRIGGER IF EXISTS set_break_tenant_id ON public.chat_business_hour_breaks;
CREATE TRIGGER set_break_tenant_id BEFORE INSERT ON public.chat_business_hour_breaks FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_business_hour();

-- chat_business_hours (1)
DROP TRIGGER IF EXISTS auto_set_tenant_chat_business_hours ON public.chat_business_hours;
CREATE TRIGGER auto_set_tenant_chat_business_hours BEFORE INSERT ON public.chat_business_hours FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

-- chat_custom_field_definitions (1)
DROP TRIGGER IF EXISTS set_tenant_id_chat_custom_field_defs ON public.chat_custom_field_definitions;
CREATE TRIGGER set_tenant_id_chat_custom_field_defs BEFORE INSERT ON public.chat_custom_field_definitions FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

-- chat_custom_fields (1)
DROP TRIGGER IF EXISTS auto_set_tenant_chat_custom_fields ON public.chat_custom_fields;
CREATE TRIGGER auto_set_tenant_chat_custom_fields BEFORE INSERT ON public.chat_custom_fields FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

-- chat_macros (2)
DROP TRIGGER IF EXISTS auto_set_tenant_chat_macros ON public.chat_macros;
CREATE TRIGGER auto_set_tenant_chat_macros BEFORE INSERT ON public.chat_macros FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_chat_macros_updated_at ON public.chat_macros;
CREATE TRIGGER update_chat_macros_updated_at BEFORE UPDATE ON public.chat_macros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- chat_rooms (9)
DROP TRIGGER IF EXISTS auto_set_tenant_chat_rooms ON public.chat_rooms;
CREATE TRIGGER auto_set_tenant_chat_rooms BEFORE INSERT ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_owner();
DROP TRIGGER IF EXISTS decrement_active_on_room_delete ON public.chat_rooms;
CREATE TRIGGER decrement_active_on_room_delete AFTER DELETE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION decrement_on_room_delete();
DROP TRIGGER IF EXISTS trg_assign_chat_room ON public.chat_rooms;
CREATE TRIGGER trg_assign_chat_room BEFORE INSERT ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION assign_chat_room();
DROP TRIGGER IF EXISTS trg_chat_timeline_insert ON public.chat_rooms;
CREATE TRIGGER trg_chat_timeline_insert AFTER INSERT ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION create_chat_timeline_event();
DROP TRIGGER IF EXISTS trg_chat_timeline_update ON public.chat_rooms;
CREATE TRIGGER trg_chat_timeline_update AFTER UPDATE OF status ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION create_chat_timeline_event();
DROP TRIGGER IF EXISTS trg_decrement_attendant_on_close ON public.chat_rooms;
CREATE TRIGGER trg_decrement_attendant_on_close AFTER UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION decrement_attendant_active_conversations();
DROP TRIGGER IF EXISTS trg_resync_attendant_counter ON public.chat_rooms;
CREATE TRIGGER trg_resync_attendant_counter AFTER INSERT OR DELETE OR UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION resync_attendant_counter_on_room_change();
DROP TRIGGER IF EXISTS trg_update_chat_metrics ON public.chat_rooms;
CREATE TRIGGER trg_update_chat_metrics AFTER UPDATE OF status ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION update_company_contact_chat_metrics();
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON public.chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- chat_service_categories (1)
DROP TRIGGER IF EXISTS set_tenant_id_chat_service_categories ON public.chat_service_categories;
CREATE TRIGGER set_tenant_id_chat_service_categories BEFORE INSERT ON public.chat_service_categories FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

-- chat_settings (2)
DROP TRIGGER IF EXISTS auto_set_tenant_chat_settings ON public.chat_settings;
CREATE TRIGGER auto_set_tenant_chat_settings BEFORE INSERT ON public.chat_settings FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_chat_settings_updated_at ON public.chat_settings;
CREATE TRIGGER update_chat_settings_updated_at BEFORE UPDATE ON public.chat_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- chat_tags (1)
DROP TRIGGER IF EXISTS auto_set_tenant_chat_tags ON public.chat_tags;
CREATE TRIGGER auto_set_tenant_chat_tags BEFORE INSERT ON public.chat_tags FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

-- chat_teams (1)
DROP TRIGGER IF EXISTS set_tenant_id_chat_teams ON public.chat_teams;
CREATE TRIGGER set_tenant_id_chat_teams BEFORE INSERT ON public.chat_teams FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

-- chat_visitors (1)
DROP TRIGGER IF EXISTS auto_set_tenant_chat_visitors ON public.chat_visitors;
CREATE TRIGGER auto_set_tenant_chat_visitors BEFORE INSERT ON public.chat_visitors FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_owner();

-- company_contacts (2)
DROP TRIGGER IF EXISTS auto_set_tenant_company_contacts ON public.company_contacts;
CREATE TRIGGER auto_set_tenant_company_contacts BEFORE INSERT ON public.company_contacts FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_company_contacts_updated_at ON public.company_contacts;
CREATE TRIGGER update_company_contacts_updated_at BEFORE UPDATE ON public.company_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- contacts (2)
DROP TRIGGER IF EXISTS auto_set_tenant_contacts ON public.contacts;
CREATE TRIGGER auto_set_tenant_contacts BEFORE INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- csms (3)
DROP TRIGGER IF EXISTS auto_set_tenant_csms ON public.csms;
CREATE TRIGGER auto_set_tenant_csms BEFORE INSERT ON public.csms FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS trg_sync_csm_chat_enabled ON public.csms;
CREATE TRIGGER trg_sync_csm_chat_enabled AFTER UPDATE OF is_chat_enabled ON public.csms FOR EACH ROW EXECUTE FUNCTION sync_csm_chat_enabled();
DROP TRIGGER IF EXISTS update_csms_updated_at ON public.csms;
CREATE TRIGGER update_csms_updated_at BEFORE UPDATE ON public.csms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- help_articles (1)
DROP TRIGGER IF EXISTS update_help_articles_updated_at ON public.help_articles;
CREATE TRIGGER update_help_articles_updated_at BEFORE UPDATE ON public.help_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- help_collections (1)
DROP TRIGGER IF EXISTS update_help_collections_updated_at ON public.help_collections;
CREATE TRIGGER update_help_collections_updated_at BEFORE UPDATE ON public.help_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- help_site_settings (1)
DROP TRIGGER IF EXISTS update_help_site_settings_updated_at ON public.help_site_settings;
CREATE TRIGGER update_help_site_settings_updated_at BEFORE UPDATE ON public.help_site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- responses (3)
DROP TRIGGER IF EXISTS on_detractor_create_recovery_trail ON public.responses;
CREATE TRIGGER on_detractor_create_recovery_trail AFTER INSERT ON public.responses FOR EACH ROW EXECUTE FUNCTION create_recovery_trail_for_detractor();
DROP TRIGGER IF EXISTS on_nps_response_update_contact ON public.responses;
CREATE TRIGGER on_nps_response_update_contact AFTER INSERT ON public.responses FOR EACH ROW EXECUTE FUNCTION update_contact_nps_on_response();
DROP TRIGGER IF EXISTS on_response_received ON public.responses;
CREATE TRIGGER on_response_received AFTER INSERT ON public.responses FOR EACH ROW EXECUTE FUNCTION update_campaign_send_response();

-- timeline_events (2)
DROP TRIGGER IF EXISTS auto_set_tenant_timeline_events ON public.timeline_events;
CREATE TRIGGER auto_set_tenant_timeline_events BEFORE INSERT ON public.timeline_events FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_timeline_events_updated_at ON public.timeline_events;
CREATE TRIGGER update_timeline_events_updated_at BEFORE UPDATE ON public.timeline_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- trail_template_activities (1)
DROP TRIGGER IF EXISTS update_trail_template_activities_updated_at ON public.trail_template_activities;
CREATE TRIGGER update_trail_template_activities_updated_at BEFORE UPDATE ON public.trail_template_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- trail_templates (2)
DROP TRIGGER IF EXISTS auto_set_tenant_trail_templates ON public.trail_templates;
CREATE TRIGGER auto_set_tenant_trail_templates BEFORE INSERT ON public.trail_templates FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_trail_templates_updated_at ON public.trail_templates;
CREATE TRIGGER update_trail_templates_updated_at BEFORE UPDATE ON public.trail_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- trails (2)
DROP TRIGGER IF EXISTS auto_set_tenant_trails ON public.trails;
CREATE TRIGGER auto_set_tenant_trails BEFORE INSERT ON public.trails FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_trails_updated_at ON public.trails;
CREATE TRIGGER update_trails_updated_at BEFORE UPDATE ON public.trails FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_email_settings (2)
DROP TRIGGER IF EXISTS auto_set_tenant_user_email_settings ON public.user_email_settings;
CREATE TRIGGER auto_set_tenant_user_email_settings BEFORE INSERT ON public.user_email_settings FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_user_email_settings_updated_at ON public.user_email_settings;
CREATE TRIGGER update_user_email_settings_updated_at BEFORE UPDATE ON public.user_email_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_notification_settings (2)
DROP TRIGGER IF EXISTS auto_set_tenant_user_notification_settings ON public.user_notification_settings;
CREATE TRIGGER auto_set_tenant_user_notification_settings BEFORE INSERT ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON public.user_notification_settings;
CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_permissions (2)
DROP TRIGGER IF EXISTS auto_set_tenant_user_permissions ON public.user_permissions;
CREATE TRIGGER auto_set_tenant_user_permissions BEFORE INSERT ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON public.user_permissions;
CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_profiles (2)
DROP TRIGGER IF EXISTS sync_attendant_name_on_profile_update ON public.user_profiles;
CREATE TRIGGER sync_attendant_name_on_profile_update AFTER UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION sync_attendant_display_name();
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. REALTIME
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendant_profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_banner_assignments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_broadcasts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.help_articles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
