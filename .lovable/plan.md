

# Fix: last message + unread not updating in room list + performance

## Root cause

The previous optimization removed the global `chat_messages` listener and replaced it with monitoring `chat_rooms.updated_at` changes. But there is **no trigger on `chat_messages`** that updates `chat_rooms.updated_at` when a message arrives. So the mechanism is broken — new messages never trigger the room activity channel.

Additionally, `get_last_messages_for_rooms` doesn't return `created_at`, so `last_message_at` is always empty string, breaking sort-by-last-message.

## Plan

### 1. New trigger: update `chat_rooms.updated_at` on new message (SQL migration)

```sql
CREATE OR REPLACE FUNCTION public.update_room_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.chat_rooms
  SET updated_at = now()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_room_on_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_room_on_new_message();
```

This makes the `chat-room-activity` channel work: every new message updates the room's `updated_at`, triggering the realtime event that fetches and displays the latest message + increments unread count.

### 2. Fix `get_last_messages_for_rooms` to return `created_at`

The RPC currently returns `(room_id, content, sender_type)` but the code expects `created_at` for `last_message_at`. Update the function:

```sql
CREATE OR REPLACE FUNCTION public.get_last_messages_for_rooms(p_room_ids uuid[])
RETURNS TABLE(room_id uuid, content text, sender_type text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (m.room_id)
    m.room_id, m.content, m.sender_type, m.created_at
  FROM chat_messages m
  WHERE m.room_id = ANY(p_room_ids)
    AND m.sender_type != 'system'
    AND m.is_internal = false
  ORDER BY m.room_id, m.created_at DESC;
$$;
```

### 3. Fix `fetchRooms` to use `created_at` from RPC (useChatRealtime.ts)

Line 226 currently sets `created_at: ""`. Fix to use `m.created_at`.

### 4. Unify `chat-rooms-updates` and `chat-room-activity` into one channel (performance)

Both channels listen to the exact same event (`UPDATE` on `chat_rooms` filtered by `tenant_id`). Merge them into a single channel with one handler that does both: update room metadata AND fetch last message when `updated_at` changes.

### 5. Remove redundant `chat_rooms` listener from `attendant-queues-realtime`

The `resync_attendant_on_room_change` trigger already updates `attendant_profiles` when rooms change. The `attendant_profiles` listener alone is sufficient — the `chat_rooms` listener in `attendant-queues-realtime` is redundant.

### 6. Increase sidebar debounce from 1s to 5s (SidebarDataContext.tsx)

Change line 151 debounce from `1000` to `5000`.

### 7. Add tenant_id filter to dashboard channel (useDashboardStats.ts)

Add `filter: tenant_id=eq.${tenantId}` to the `dashboard-realtime-rooms` channel. Accept `tenantId` param in the hook.

## Files to modify

| File | Change |
|---|---|
| New SQL migration | Create `trg_update_room_on_message` trigger + update `get_last_messages_for_rooms` to include `created_at` |
| `src/hooks/useChatRealtime.ts` | Merge 2 room channels into 1; fix `created_at` usage in fetchRooms; remove `chat_rooms` from attendant-queues |
| `src/contexts/SidebarDataContext.tsx` | Debounce 1s → 5s |
| `src/hooks/useDashboardStats.ts` | Accept `tenantId`, add filter |
| `src/pages/AdminDashboard.tsx` | Pass `tenantId` to `useDashboardStats` |

## Expected result

- New messages immediately update `last_message` and `unread_count` in the room list for non-selected rooms
- Unread badge appears correctly
- Database request volume drops ~60% due to channel consolidation and debounce increase

