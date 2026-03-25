
-- Consolidate duplicate visitors: move all rooms to the primary visitor (most rooms), then delete secondary visitors
-- Step 1: Update chat_rooms to point to primary visitor
WITH dupes AS (
  SELECT company_contact_id
  FROM chat_visitors
  WHERE tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678'
    AND company_contact_id IS NOT NULL
  GROUP BY company_contact_id
  HAVING count(*) > 1
),
ranked AS (
  SELECT v.id as visitor_id, v.company_contact_id,
    (SELECT count(*) FROM chat_rooms r WHERE r.visitor_id = v.id) as room_count,
    ROW_NUMBER() OVER (
      PARTITION BY v.company_contact_id 
      ORDER BY (SELECT count(*) FROM chat_rooms r WHERE r.visitor_id = v.id) DESC, v.created_at ASC
    ) as rn
  FROM chat_visitors v
  JOIN dupes d ON d.company_contact_id = v.company_contact_id
  WHERE v.tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678'
),
primary_visitors AS (
  SELECT visitor_id, company_contact_id FROM ranked WHERE rn = 1
),
secondary_visitors AS (
  SELECT r.visitor_id as secondary_id, p.visitor_id as primary_id
  FROM ranked r
  JOIN primary_visitors p ON p.company_contact_id = r.company_contact_id
  WHERE r.rn > 1
)
UPDATE chat_rooms 
SET visitor_id = sv.primary_id
FROM secondary_visitors sv
WHERE chat_rooms.visitor_id = sv.secondary_id;

-- Step 2: Delete secondary visitors (now orphaned)
WITH dupes AS (
  SELECT company_contact_id
  FROM chat_visitors
  WHERE tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678'
    AND company_contact_id IS NOT NULL
  GROUP BY company_contact_id
  HAVING count(*) > 1
),
ranked AS (
  SELECT v.id as visitor_id, v.company_contact_id,
    (SELECT count(*) FROM chat_rooms r WHERE r.visitor_id = v.id) as room_count,
    ROW_NUMBER() OVER (
      PARTITION BY v.company_contact_id 
      ORDER BY (SELECT count(*) FROM chat_rooms r WHERE r.visitor_id = v.id) DESC, v.created_at ASC
    ) as rn
  FROM chat_visitors v
  JOIN dupes d ON d.company_contact_id = v.company_contact_id
  WHERE v.tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678'
)
DELETE FROM chat_visitors
WHERE id IN (SELECT visitor_id FROM ranked WHERE rn > 1);
