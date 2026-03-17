-- Drop 13 redundant duplicate triggers identified in audit

DROP TRIGGER IF EXISTS on_campaign_contact_create_nps_trail ON campaign_contacts;
DROP TRIGGER IF EXISTS on_campaign_contact_email_sent ON campaign_contacts;
DROP TRIGGER IF EXISTS set_tenant_id_from_banner_trigger ON chat_banner_field_rules;
DROP TRIGGER IF EXISTS set_chat_banners_tenant_id ON chat_banners;
DROP TRIGGER IF EXISTS set_broadcast_tenant_id ON chat_broadcasts;
DROP TRIGGER IF EXISTS update_broadcasts_updated_at ON chat_broadcasts;
DROP TRIGGER IF EXISTS set_break_tenant_id ON chat_business_hour_breaks;
DROP TRIGGER IF EXISTS set_tenant_id_chat_service_categories ON chat_service_categories;
DROP TRIGGER IF EXISTS set_tenant_id_chat_teams ON chat_teams;
DROP TRIGGER IF EXISTS trg_sync_csm_chat_enabled ON csms;
DROP TRIGGER IF EXISTS recovery_trail_for_detractor ON responses;
DROP TRIGGER IF EXISTS update_campaign_send_on_response ON responses;
DROP TRIGGER IF EXISTS update_contact_nps ON responses;