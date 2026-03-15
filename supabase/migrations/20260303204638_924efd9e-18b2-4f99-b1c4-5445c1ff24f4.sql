
ALTER TABLE public.chat_settings
  ADD COLUMN IF NOT EXISTS ws_sort_order text NOT NULL DEFAULT 'last_message',
  ADD COLUMN IF NOT EXISTS ws_show_metrics boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_contact_data boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_custom_fields boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_timeline boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_recent_chats boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_company_external_id boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_show_contact_external_id boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ws_recent_chats_count integer NOT NULL DEFAULT 5;
