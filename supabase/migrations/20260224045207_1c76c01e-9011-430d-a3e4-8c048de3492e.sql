
ALTER TABLE public.contacts ADD COLUMN external_id text;

CREATE UNIQUE INDEX idx_contacts_external_id_tenant 
  ON public.contacts (tenant_id, external_id) 
  WHERE external_id IS NOT NULL;

ALTER TABLE public.contacts ALTER COLUMN email DROP NOT NULL;
