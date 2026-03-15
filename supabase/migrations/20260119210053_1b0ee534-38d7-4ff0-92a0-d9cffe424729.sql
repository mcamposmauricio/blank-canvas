
-- 1. Add address fields to contacts table (will be used as companies)
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS street_number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil';

-- 2. Create company_contacts table for people
CREATE TABLE public.company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  department TEXT,
  is_primary BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create trigger for updated_at
CREATE TRIGGER update_company_contacts_updated_at
  BEFORE UPDATE ON public.company_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Enable RLS
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for company_contacts
CREATE POLICY "Users can view their company contacts"
  ON public.company_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their company contacts"
  ON public.company_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their company contacts"
  ON public.company_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their company contacts"
  ON public.company_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Public access for NPS responses
CREATE POLICY "Public can view company contacts for NPS"
  ON public.company_contacts FOR SELECT
  USING (true);

-- 7. Update campaign_contacts to reference company_contacts instead of contacts
ALTER TABLE public.campaign_contacts 
  ADD COLUMN IF NOT EXISTS company_contact_id UUID REFERENCES public.company_contacts(id) ON DELETE CASCADE;
