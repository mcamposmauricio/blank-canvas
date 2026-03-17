
# Plan: Tenant Isolation Review — COMPLETED ✅

## What was done

### Phase 1: Backfill
- ✅ Populated `tenant_id` on all 6 `user_roles` records (were NULL)
- ✅ No duplicate attendant_profiles found (already clean)

### Phase 2: RLS Migration (20 tables)
- ✅ Rewrote all policies from `user_id = auth.uid()` to `tenant_id = get_user_tenant_id(auth.uid())`
- ✅ Tables: contacts, company_contacts, csms, campaigns, campaign_contacts, campaign_sends, responses, chat_settings, chat_business_hours, chat_auto_rules, chat_macros, chat_tags, chat_custom_fields, chat_rooms, chat_messages, chat_visitors, attendant_profiles, brand_settings, api_keys, user_roles
- ✅ Kept anon policies for widget (chat_rooms, chat_messages, chat_visitors, chat_settings) and NPS (campaigns, campaign_contacts, contacts, brand_settings)
- ✅ Kept master policies intact
- ✅ chat_macros: private macros only visible to owner, public macros visible to all tenant members

### Phase 2.5: Trigger fix
- ✅ Fixed `campaign_contacts` and `campaign_sends` triggers — they used `set_tenant_id_from_user` but have no `user_id` column
- ✅ Created `set_tenant_id_from_campaign()` function to derive tenant_id from the campaign

### Phase 3: Frontend
- ✅ No frontend changes needed — RLS handles all scoping automatically
- ✅ INSERT operations continue using `user_id = auth.uid()` for audit, triggers fill `tenant_id`

## Result
- Admin of tenant A sees ALL data from tenant A (not just their own)
- Admin of tenant A cannot see data from tenant B
- Widget (anon) continues working
- NPS public access continues working
- Master sees everything
