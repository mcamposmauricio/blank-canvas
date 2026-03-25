
-- Step 1: Map attendant_id on rooms by first attendant message sender_name
UPDATE chat_rooms SET attendant_id = mapping.att_id
FROM (
  SELECT DISTINCT ON (cm.room_id) cm.room_id,
    CASE LOWER(TRIM(cm.sender_name))
      WHEN 'felipe' THEN '8799798f-20b1-44c1-9313-231e69d578e8'::uuid
      WHEN 'lucas'  THEN '4873662b-2c67-475f-b8ce-c7bd3d902ee3'::uuid
      WHEN 'ana'    THEN '20d1df9d-b67a-4fa4-a7af-d625627ab5e0'::uuid
      WHEN 'matheus' THEN 'b15cea0b-ec10-462d-8dc3-8e553f42b1a1'::uuid
    END as att_id
  FROM chat_messages cm
  WHERE cm.sender_type = 'attendant'
    AND LOWER(TRIM(cm.sender_name)) IN ('felipe','lucas','ana','matheus')
  ORDER BY cm.room_id, cm.created_at
) mapping
WHERE chat_rooms.id = mapping.room_id
  AND chat_rooms.attendant_id IS NULL
  AND chat_rooms.tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678';

-- Step 2: Round-robin distribute remaining NULL attendant_id rooms
WITH remaining AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM chat_rooms
  WHERE attendant_id IS NULL
    AND tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678'
),
assignments AS (
  SELECT id,
    CASE (rn % 4)
      WHEN 1 THEN '8799798f-20b1-44c1-9313-231e69d578e8'::uuid -- Felipe
      WHEN 2 THEN '4873662b-2c67-475f-b8ce-c7bd3d902ee3'::uuid -- Lucas
      WHEN 3 THEN '20d1df9d-b67a-4fa4-a7af-d625627ab5e0'::uuid -- Ana
      WHEN 0 THEN 'b15cea0b-ec10-462d-8dc3-8e553f42b1a1'::uuid -- Matheus
    END as att_id
  FROM remaining
)
UPDATE chat_rooms SET attendant_id = a.att_id
FROM assignments a WHERE chat_rooms.id = a.id;

-- Step 3: Fill sender_id in messages where sender_type='attendant' and sender_id IS NULL
UPDATE chat_messages SET sender_id = CASE LOWER(TRIM(sender_name))
    WHEN 'felipe' THEN '19c4c328-0627-482f-b787-47b5928e702f'
    WHEN 'lucas'  THEN '58dd7b3c-5844-4177-baf0-2ef09714aa2a'
    WHEN 'ana'    THEN 'c148f8fe-000d-4cbf-be57-159dbdad29f5'
    WHEN 'matheus' THEN '21aa0988-c5ea-4961-9884-36d2a69b24c1'
    WHEN 'thainá' THEN '3437bb4f-c44d-4b19-94f9-8aa02811c255'
  END
WHERE sender_type = 'attendant'
  AND sender_id IS NULL
  AND LOWER(TRIM(sender_name)) IN ('felipe','lucas','ana','matheus','thainá')
  AND room_id IN (SELECT id FROM chat_rooms WHERE tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678');

-- Step 4: Recalculate active_conversations for each attendant
UPDATE attendant_profiles ap
SET active_conversations = sub.cnt
FROM (
  SELECT attendant_id, COUNT(*) as cnt
  FROM chat_rooms
  WHERE tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678'
    AND status IN ('active','waiting')
  GROUP BY attendant_id
) sub
WHERE ap.id = sub.attendant_id;

UPDATE attendant_profiles
SET active_conversations = 0
WHERE tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678'
  AND id NOT IN (
    SELECT DISTINCT attendant_id FROM chat_rooms
    WHERE tenant_id = 'eee96b59-d7da-45cf-93f1-e3ab0796e678'
      AND status IN ('active','waiting')
      AND attendant_id IS NOT NULL
  );
