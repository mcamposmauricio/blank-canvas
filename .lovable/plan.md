

# Plan: Default Queue/Team Always Active + Priority Assignment

## Current State & Issues Found

1. **Duplicate triggers on `chat_rooms` still exist** — the previous cleanup migration did NOT remove them. There are 6 duplicate pairs causing double execution of assignment, decrement, timeline, and metrics logic.
2. **`assign_chat_room` runs twice** — as BEFORE INSERT (`trg_assign_chat_room`) AND AFTER INSERT/UPDATE (`auto_assign_chat_room`). The function modifies `NEW` which only works in BEFORE triggers, so the AFTER copy is a broken no-op that wastes resources.
3. **No auto-provisioning** of default team, category, or assignment config — these only get created when an admin opens specific frontend tabs.
4. **New attendants not auto-linked to default team** — relies on fragile `setTimeout(1000)` in frontend.
5. **Manual category rules not prioritized** — the `assign_chat_room` function already falls back to default category, but there's no guarantee manual rules are checked first during visitor resolution.

## Changes

### Migration 1: Fix chat_rooms duplicate triggers (cleanup)

Drop 6 redundant triggers on `chat_rooms`:

| Keep | Drop (redundant) |
|---|---|
| `trg_assign_chat_room` (BEFORE INSERT) | `auto_assign_chat_room` (AFTER — broken, can't modify NEW) |
| `chat_timeline_on_room_change` (AFTER UPDATE) | `trg_chat_timeline_update` (duplicate UPDATE) |
| `trg_chat_timeline_insert` (AFTER INSERT) | *(keep both — one is INSERT, one is UPDATE)* |
| `decrement_on_room_close` (with WHEN clause) | `trg_decrement_attendant_on_close` (no WHEN — fires on ALL updates) |
| `decrement_on_room_delete` (with WHEN clause) | `decrement_active_on_room_delete` (no WHEN clause) |
| `resync_attendant_on_room_change` (UPDATE of attendant_id) | `trg_resync_attendant_counter` (INSERT/DELETE/UPDATE — too broad) |
| `trg_update_chat_metrics` (UPDATE of status) | `update_company_contact_metrics_on_close` (duplicate with WHEN) |

### Migration 2: Auto-provision defaults + attendant auto-link

**Function `ensure_tenant_chat_defaults(p_tenant_id, p_user_id)`:**
- Creates default `chat_teams` if none exists for tenant
- Creates default `chat_service_categories` if none exists
- Creates `chat_category_teams` linking them
- Creates `chat_assignment_configs` with `enabled = true` for that link

**Trigger on `user_profiles` AFTER INSERT:**
- Calls `ensure_tenant_chat_defaults` when a new user is created (first user of a tenant provisions defaults)

**Update `sync_csm_chat_enabled()`:**
- After creating `attendant_profile`, call `ensure_tenant_chat_defaults` then insert into `chat_team_members` for the default team
- Remove frontend `setTimeout` workaround in `AttendantsTab.tsx`

### Migration 3: Priority for manual category rules

The current `assign_chat_room()` function already does the right thing:
1. Check contact's `service_category_id` (set by manual rules via `applyCategoryFieldRules` in resolve-chat-visitor)
2. If null, fall back to default category

This means **manual rules already take priority** — they set `service_category_id` on the contact during `resolve-chat-visitor`, and the trigger uses that value. The contact itself stays without a forced category assignment (no default written to contact), so the trigger's fallback to default category handles the queue routing without polluting the contact data.

No changes needed to the assignment priority logic — it already works correctly.

### Frontend cleanup

- `AttendantsTab.tsx`: Remove the `setTimeout(1000)` + manual default team assignment block (lines 85-116), since the trigger now handles it automatically.

## Summary

```text
┌─────────────────────────────────────────────────┐
│ Fix: Drop 6 duplicate triggers on chat_rooms    │
│  └→ assign_chat_room stays BEFORE INSERT only   │
├─────────────────────────────────────────────────┤
│ New tenant / first user_profile INSERT          │
│  └→ ensure_tenant_chat_defaults()               │
│      ├─ chat_teams (default, is_default=true)   │
│      ├─ chat_service_categories (default)        │
│      ├─ chat_category_teams (link)               │
│      └─ chat_assignment_configs (enabled=true)   │
├─────────────────────────────────────────────────┤
│ CSM is_chat_enabled = true                      │
│  └→ sync_csm_chat_enabled()                    │
│      ├─ ensure_tenant_chat_defaults()            │
│      ├─ INSERT attendant_profile                 │
│      └─ INSERT chat_team_members (default team)  │
├─────────────────────────────────────────────────┤
│ Chat assignment priority (already works):       │
│  1. Manual rules → service_category_id on contact│
│  2. No rules matched → fallback to default cat   │
│  3. Default cat → default team → auto-assign     │
└─────────────────────────────────────────────────┘
```

