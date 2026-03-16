-- =============================================
-- ALL TRIGGERS (corrected for actual table names)
-- =============================================

-- 1. updated_at triggers
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendant_profiles_updated_at ON public.attendant_profiles;
CREATE TRIGGER update_attendant_profiles_updated_at BEFORE UPDATE ON public.attendant_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_settings_updated_at ON public.brand_settings;
CREATE TRIGGER update_brand_settings_updated_at BEFORE UPDATE ON public.brand_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_auto_rules_updated_at ON public.chat_auto_rules;
CREATE TRIGGER update_chat_auto_rules_updated_at BEFORE UPDATE ON public.chat_auto_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_assignment_configs_updated_at ON public.chat_assignment_configs;
CREATE TRIGGER update_chat_assignment_configs_updated_at BEFORE UPDATE ON public.chat_assignment_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_banners_updated_at ON public.chat_banners;
CREATE TRIGGER update_chat_banners_updated_at BEFORE UPDATE ON public.chat_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_broadcasts_updated_at ON public.chat_broadcasts;
CREATE TRIGGER update_chat_broadcasts_updated_at BEFORE UPDATE ON public.chat_broadcasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_macros_updated_at ON public.chat_macros;
CREATE TRIGGER update_chat_macros_updated_at BEFORE UPDATE ON public.chat_macros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON public.chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_settings_updated_at ON public.chat_settings;
CREATE TRIGGER update_chat_settings_updated_at BEFORE UPDATE ON public.chat_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_contacts_updated_at ON public.company_contacts;
CREATE TRIGGER update_company_contacts_updated_at BEFORE UPDATE ON public.company_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_csms_updated_at ON public.csms;
CREATE TRIGGER update_csms_updated_at BEFORE UPDATE ON public.csms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_help_articles_updated_at ON public.help_articles;
CREATE TRIGGER update_help_articles_updated_at BEFORE UPDATE ON public.help_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_help_collections_updated_at ON public.help_collections;
CREATE TRIGGER update_help_collections_updated_at BEFORE UPDATE ON public.help_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. tenant_id auto-set from user_id
DROP TRIGGER IF EXISTS auto_set_tenant_api_keys ON public.api_keys;
CREATE TRIGGER auto_set_tenant_api_keys BEFORE INSERT ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_brand_settings ON public.brand_settings;
CREATE TRIGGER auto_set_tenant_brand_settings BEFORE INSERT ON public.brand_settings FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_campaigns ON public.campaigns;
CREATE TRIGGER auto_set_tenant_campaigns BEFORE INSERT ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_campaign_contacts ON public.campaign_contacts;
CREATE TRIGGER auto_set_tenant_campaign_contacts BEFORE INSERT ON public.campaign_contacts FOR EACH ROW WHEN (NEW.tenant_id IS NULL) EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_campaign_sends ON public.campaign_sends;
CREATE TRIGGER auto_set_tenant_campaign_sends BEFORE INSERT ON public.campaign_sends FOR EACH ROW WHEN (NEW.tenant_id IS NULL) EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_auto_rules ON public.chat_auto_rules;
CREATE TRIGGER auto_set_tenant_chat_auto_rules BEFORE INSERT ON public.chat_auto_rules FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_banners ON public.chat_banners;
CREATE TRIGGER auto_set_tenant_chat_banners BEFORE INSERT ON public.chat_banners FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_broadcasts ON public.chat_broadcasts;
CREATE TRIGGER auto_set_tenant_chat_broadcasts BEFORE INSERT ON public.chat_broadcasts FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_business_hours ON public.chat_business_hours;
CREATE TRIGGER auto_set_tenant_chat_business_hours BEFORE INSERT ON public.chat_business_hours FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_custom_fields ON public.chat_custom_fields;
CREATE TRIGGER auto_set_tenant_chat_custom_fields BEFORE INSERT ON public.chat_custom_fields FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_macros ON public.chat_macros;
CREATE TRIGGER auto_set_tenant_chat_macros BEFORE INSERT ON public.chat_macros FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_service_categories ON public.chat_service_categories;
CREATE TRIGGER auto_set_tenant_chat_service_categories BEFORE INSERT ON public.chat_service_categories FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_settings ON public.chat_settings;
CREATE TRIGGER auto_set_tenant_chat_settings BEFORE INSERT ON public.chat_settings FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_tags ON public.chat_tags;
CREATE TRIGGER auto_set_tenant_chat_tags BEFORE INSERT ON public.chat_tags FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_teams ON public.chat_teams;
CREATE TRIGGER auto_set_tenant_chat_teams BEFORE INSERT ON public.chat_teams FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_contacts ON public.contacts;
CREATE TRIGGER auto_set_tenant_contacts BEFORE INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_csms ON public.csms;
CREATE TRIGGER auto_set_tenant_csms BEFORE INSERT ON public.csms FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_user_email_settings ON public.user_email_settings;
CREATE TRIGGER auto_set_tenant_user_email_settings BEFORE INSERT ON public.user_email_settings FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_help_articles ON public.help_articles;
CREATE TRIGGER auto_set_tenant_help_articles BEFORE INSERT ON public.help_articles FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_help_collections ON public.help_collections;
CREATE TRIGGER auto_set_tenant_help_collections BEFORE INSERT ON public.help_collections FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS auto_set_tenant_responses ON public.responses;
CREATE TRIGGER auto_set_tenant_responses BEFORE INSERT ON public.responses FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- 3. tenant_id from owner_user_id
DROP TRIGGER IF EXISTS auto_set_tenant_chat_rooms ON public.chat_rooms;
CREATE TRIGGER auto_set_tenant_chat_rooms BEFORE INSERT ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_owner();

DROP TRIGGER IF EXISTS auto_set_tenant_chat_visitors ON public.chat_visitors;
CREATE TRIGGER auto_set_tenant_chat_visitors BEFORE INSERT ON public.chat_visitors FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_owner();

-- 4. tenant_id from banner_id
DROP TRIGGER IF EXISTS auto_set_tenant_banner_assignments ON public.chat_banner_assignments;
CREATE TRIGGER auto_set_tenant_banner_assignments BEFORE INSERT ON public.chat_banner_assignments FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_banner();

DROP TRIGGER IF EXISTS auto_set_tenant_banner_field_rules ON public.chat_banner_field_rules;
CREATE TRIGGER auto_set_tenant_banner_field_rules BEFORE INSERT ON public.chat_banner_field_rules FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_banner();

-- 5. tenant_id from business_hour_id
DROP TRIGGER IF EXISTS auto_set_tenant_bh_breaks ON public.chat_business_hour_breaks;
CREATE TRIGGER auto_set_tenant_bh_breaks BEFORE INSERT ON public.chat_business_hour_breaks FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_business_hour();

DROP TRIGGER IF EXISTS auto_set_tenant_bh_overrides ON public.chat_business_hour_overrides;
CREATE TRIGGER auto_set_tenant_bh_overrides BEFORE INSERT ON public.chat_business_hour_overrides FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- 6. Chat assignment trigger
DROP TRIGGER IF EXISTS auto_assign_chat_room ON public.chat_rooms;
CREATE TRIGGER auto_assign_chat_room AFTER INSERT OR UPDATE OF status ON public.chat_rooms FOR EACH ROW WHEN (NEW.status = 'waiting') EXECUTE FUNCTION public.assign_chat_room();

-- 7. Chat room close / decrement triggers
DROP TRIGGER IF EXISTS decrement_on_room_close ON public.chat_rooms;
CREATE TRIGGER decrement_on_room_close AFTER UPDATE OF status ON public.chat_rooms FOR EACH ROW WHEN (OLD.status = 'active' AND NEW.status = 'closed') EXECUTE FUNCTION public.decrement_attendant_active_conversations();

DROP TRIGGER IF EXISTS decrement_on_room_delete ON public.chat_rooms;
CREATE TRIGGER decrement_on_room_delete AFTER DELETE ON public.chat_rooms FOR EACH ROW WHEN (OLD.status = 'active' AND OLD.attendant_id IS NOT NULL) EXECUTE FUNCTION public.decrement_on_room_delete();

DROP TRIGGER IF EXISTS resync_attendant_on_room_change ON public.chat_rooms;
CREATE TRIGGER resync_attendant_on_room_change AFTER UPDATE OF attendant_id ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION public.resync_attendant_counter_on_room_change();

-- 8. Chat timeline event
DROP TRIGGER IF EXISTS chat_timeline_on_room_change ON public.chat_rooms;
CREATE TRIGGER chat_timeline_on_room_change AFTER UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION public.create_chat_timeline_event();

-- 9. Company contact chat metrics
DROP TRIGGER IF EXISTS update_company_contact_metrics_on_close ON public.chat_rooms;
CREATE TRIGGER update_company_contact_metrics_on_close AFTER UPDATE OF status ON public.chat_rooms FOR EACH ROW WHEN (OLD.status = 'active' AND NEW.status = 'closed' AND NEW.company_contact_id IS NOT NULL) EXECUTE FUNCTION public.update_company_contact_chat_metrics();

-- 10. NPS triggers
DROP TRIGGER IF EXISTS update_contact_nps ON public.responses;
CREATE TRIGGER update_contact_nps AFTER INSERT ON public.responses FOR EACH ROW EXECUTE FUNCTION public.update_contact_nps_on_response();

DROP TRIGGER IF EXISTS nps_trail_on_campaign_contact ON public.campaign_contacts;
CREATE TRIGGER nps_trail_on_campaign_contact AFTER INSERT ON public.campaign_contacts FOR EACH ROW EXECUTE FUNCTION public.create_nps_trail_on_campaign_contact();

DROP TRIGGER IF EXISTS nps_trail_email_sent ON public.campaign_contacts;
CREATE TRIGGER nps_trail_email_sent AFTER UPDATE OF email_sent ON public.campaign_contacts FOR EACH ROW WHEN (NEW.email_sent = true AND (OLD.email_sent IS DISTINCT FROM true)) EXECUTE FUNCTION public.update_nps_trail_on_email_sent();

DROP TRIGGER IF EXISTS recovery_trail_for_detractor ON public.responses;
CREATE TRIGGER recovery_trail_for_detractor AFTER INSERT ON public.responses FOR EACH ROW WHEN (NEW.score <= 6) EXECUTE FUNCTION public.create_recovery_trail_for_detractor();

DROP TRIGGER IF EXISTS update_campaign_send_on_response ON public.responses;
CREATE TRIGGER update_campaign_send_on_response AFTER INSERT ON public.responses FOR EACH ROW EXECUTE FUNCTION public.update_campaign_send_response();

-- 11. CSM sync triggers
DROP TRIGGER IF EXISTS sync_csm_chat_enabled_trigger ON public.csms;
CREATE TRIGGER sync_csm_chat_enabled_trigger AFTER UPDATE OF is_chat_enabled ON public.csms FOR EACH ROW EXECUTE FUNCTION public.sync_csm_chat_enabled();

DROP TRIGGER IF EXISTS sync_attendant_name_trigger ON public.attendant_profiles;
CREATE TRIGGER sync_attendant_name_trigger AFTER UPDATE OF display_name ON public.attendant_profiles FOR EACH ROW EXECUTE FUNCTION public.sync_attendant_display_name();