-- Add external_id column to company_contacts table
ALTER TABLE public.company_contacts ADD COLUMN external_id text;

-- Create index for fast lookup
CREATE INDEX idx_company_contacts_external_id ON public.company_contacts(external_id);

-- Create unique index per user (each client has their own external_ids)
CREATE UNIQUE INDEX idx_company_contacts_user_external_id 
  ON public.company_contacts(user_id, external_id) 
  WHERE external_id IS NOT NULL;

-- Remove external_id from contacts table (no longer needed there)
ALTER TABLE public.contacts DROP COLUMN IF EXISTS external_id;