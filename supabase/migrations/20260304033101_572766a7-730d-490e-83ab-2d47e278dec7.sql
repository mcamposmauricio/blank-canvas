
-- Add granular workspace settings columns to chat_settings
ALTER TABLE public.chat_settings
  ADD COLUMN IF NOT EXISTS ws_show_company_info boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_company_cnpj boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_company_sector boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_company_location boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_metric_health boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_metric_mrr boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_metric_contract boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_metric_nps boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_metric_renewal boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_contact_department boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_contact_chat_stats boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_hidden_custom_fields text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ws_timeline_max_events integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ws_default_panel_open boolean NOT NULL DEFAULT true;
