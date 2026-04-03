-- Step 1: Move all chat_rooms from duplicate visitors to the primary (oldest) visitor
WITH ranked AS (
  SELECT id, company_contact_id,
    ROW_NUMBER() OVER (PARTITION BY company_contact_id ORDER BY created_at ASC) as rn
  FROM chat_visitors
  WHERE company_contact_id IS NOT NULL
),
primaries AS (
  SELECT id as primary_id, company_contact_id FROM ranked WHERE rn = 1
),
duplicates AS (
  SELECT r.id as dup_id, p.primary_id
  FROM ranked r
  JOIN primaries p ON p.company_contact_id = r.company_contact_id
  WHERE r.rn > 1
)
UPDATE chat_rooms SET visitor_id = d.primary_id
FROM duplicates d WHERE chat_rooms.visitor_id = d.dup_id;

-- Step 2: Delete orphaned duplicate visitors (those that no longer have any rooms)
DELETE FROM chat_visitors
WHERE id IN (
  SELECT id FROM (
    SELECT id, company_contact_id,
      ROW_NUMBER() OVER (PARTITION BY company_contact_id ORDER BY created_at ASC) as rn
    FROM chat_visitors WHERE company_contact_id IS NOT NULL
  ) sub WHERE rn > 1
);