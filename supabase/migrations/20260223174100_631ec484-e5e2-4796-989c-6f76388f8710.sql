-- Sync company_contacts.chat_visitor_id to the most recent visitor per company_contact_id
WITH latest_visitors AS (
  SELECT DISTINCT ON (company_contact_id) id, company_contact_id
  FROM chat_visitors
  WHERE company_contact_id IS NOT NULL
  ORDER BY company_contact_id, created_at DESC
)
UPDATE company_contacts cc
SET chat_visitor_id = lv.id
FROM latest_visitors lv
WHERE cc.id = lv.company_contact_id;

-- Delete duplicate visitors, keeping only the most recent per company_contact_id
DELETE FROM chat_visitors
WHERE company_contact_id IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (company_contact_id) id
    FROM chat_visitors
    WHERE company_contact_id IS NOT NULL
    ORDER BY company_contact_id, created_at DESC
  );