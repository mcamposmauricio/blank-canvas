

# Audit: Business Rules & Remaining Duplicate Triggers

## Business Rules Verification

All 8 rules listed are correctly implemented:

| Rule | Status | Notes |
|---|---|---|
| **3. Assignment Automático** | OK | `assign_chat_room()` BEFORE INSERT trigger handles round_robin, load_balance, priority bypass, fallback team, business hours |
| **4. Horário Comercial** | OK | Business hours, breaks, and overrides checked in both trigger and edge function. Timezone America/Sao_Paulo |
| **7. Outbound (Banners)** | OK | `get-visitor-banners` handles target_all, field_rules, auto_assign_by_rules, voting, scheduling, display_frequency |
| **8. Chat Metrics** | OK | `update_company_contact_chat_metrics()` trigger on room close; `decrement_attendant_active_conversations()` + `resync_attendant_counter_on_room_change()` for counters |
| **9. Auto-Rules** | OK | `process-chat-auto-rules` edge function: inactivity_warning chain, attendant_absence, auto_close with resolution_status |
| **10. Broadcasts** | OK | `process-chat-broadcasts` creates rooms per recipient, sets status flow draft→scheduled→live→completed |

## Problem: 13 Duplicate Triggers Still Exist

The previous migration did NOT successfully remove the duplicate triggers. They are still present:

| Table | Trigger to DROP |
|---|---|
| `campaign_contacts` | `on_campaign_contact_create_nps_trail` |
| `campaign_contacts` | `on_campaign_contact_email_sent` |
| `chat_banner_field_rules` | `set_tenant_id_from_banner_trigger` |
| `chat_banners` | `set_chat_banners_tenant_id` |
| `chat_broadcasts` | `set_broadcast_tenant_id` |
| `chat_broadcasts` | `update_broadcasts_updated_at` |
| `chat_business_hour_breaks` | `set_break_tenant_id` |
| `chat_service_categories` | `set_tenant_id_chat_service_categories` |
| `chat_teams` | `set_tenant_id_chat_teams` |
| `csms` | `trg_sync_csm_chat_enabled` |
| `responses` | `recovery_trail_for_detractor` |
| `responses` | `update_campaign_send_on_response` |
| `responses` | `update_contact_nps` |

## Fix

One SQL migration to drop all 13 redundant triggers. No frontend changes needed.

