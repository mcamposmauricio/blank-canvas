

# Fix: Resync active_conversations counters

## Problem
All `active_conversations` values are `0` despite real counts being Lucas=3, Matheus=2, Felipe=1. The bulk attendant_id migration triggered `resync_attendant_counter_on_room_change` on closed rooms, which reset the counters.

## Fix
One SQL migration to recalculate all counters from actual data:

```sql
UPDATE attendant_profiles ap
SET active_conversations = COALESCE(sub.cnt, 0)
FROM (
  SELECT attendant_id, COUNT(*) as cnt
  FROM chat_rooms
  WHERE status IN ('active','waiting')
  GROUP BY attendant_id
) sub
WHERE ap.id = sub.attendant_id
  AND ap.tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678';

-- Also zero out attendants with no active rooms
UPDATE attendant_profiles
SET active_conversations = 0
WHERE tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678'
  AND id NOT IN (
    SELECT DISTINCT attendant_id FROM chat_rooms
    WHERE status IN ('active','waiting') AND attendant_id IS NOT NULL
  )
  AND active_conversations != 0;
```

## Files
| File | Change |
|---|---|
| New migration SQL | Resync active_conversations from real room counts |

