
-- Apagar CSAT scores e comments das empresas Kevin Pro Bar e Marq. Testes
UPDATE chat_rooms
SET csat_score = NULL, csat_comment = NULL
WHERE contact_id IN (
  '7da1a0df-1848-41c6-9620-948ed842eb35',
  '26087678-ae68-461c-8c09-552f464f7cf6'
)
AND csat_score IS NOT NULL;

-- Zerar média CSAT nos company_contacts
UPDATE company_contacts
SET chat_avg_csat = 0
WHERE company_id IN (
  '7da1a0df-1848-41c6-9620-948ed842eb35',
  '26087678-ae68-461c-8c09-552f464f7cf6'
)
AND chat_avg_csat > 0;
