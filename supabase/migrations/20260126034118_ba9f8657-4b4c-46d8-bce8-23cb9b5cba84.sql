-- Adicionar coluna para armazenar a chave completa
ALTER TABLE api_keys ADD COLUMN encrypted_key text;

-- Atualizar a chave existente com o valor fornecido pelo usuario
UPDATE api_keys 
SET encrypted_key = 'nps_75502adb5f73c2e030ebc1678d47205a487a36de9259f57c5e6a982c7e20b5a4'
WHERE key_prefix = 'nps_75502adb';