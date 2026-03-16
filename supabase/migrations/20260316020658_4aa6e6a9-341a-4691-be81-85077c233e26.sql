-- Add sound_enabled to attendant_profiles
ALTER TABLE public.attendant_profiles ADD COLUMN IF NOT EXISTS sound_enabled boolean NOT NULL DEFAULT true;

-- Add tenant_id to tables that need it for multi-tenancy
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.brand_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.chat_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.company_contacts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_email_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.campaign_contacts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.campaign_sends ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.chat_visitors ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.chat_business_hours ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.chat_auto_rules ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.chat_custom_fields ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.chat_macros ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.chat_tags ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.chat_room_reads ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.trail_templates ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.trail_activity_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.csms ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_notification_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);