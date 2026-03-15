
-- =============================================
-- Phase 1: Tenants + Invite System + CS fields
-- =============================================

-- 1. Create tenants table (foundation for multi-tenancy)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tenants"
  ON public.tenants FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Create initial tenant for existing organization
INSERT INTO public.tenants (name, slug) 
VALUES ('Organizacao Principal', 'org-principal');

-- 3. Make user_id nullable on user_profiles (needed for pending invites)
ALTER TABLE public.user_profiles ALTER COLUMN user_id DROP NOT NULL;

-- 4. Add invite + CS columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS invite_token text UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS invite_status text DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS specialty text[] DEFAULT '{}';

-- 5. Link ALL existing profiles to the default tenant
UPDATE public.user_profiles 
SET tenant_id = (SELECT id FROM public.tenants LIMIT 1),
    invite_status = 'accepted'
WHERE user_id IS NOT NULL;

-- 6. RLS: Public can look up pending invites by token (for signup form)
CREATE POLICY "Public can view pending invites by token"
  ON public.user_profiles FOR SELECT
  USING (invite_token IS NOT NULL AND invite_status = 'pending');

-- 7. RLS: Authenticated user can accept a pending invite (set their user_id)
CREATE POLICY "Authenticated can accept pending invite"
  ON public.user_profiles FOR UPDATE
  USING (invite_token IS NOT NULL AND invite_status = 'pending')
  WITH CHECK (user_id = auth.uid());
