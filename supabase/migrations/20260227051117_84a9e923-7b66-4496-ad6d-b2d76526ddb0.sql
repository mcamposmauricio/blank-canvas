
-- Add new columns to chat_banners
ALTER TABLE public.chat_banners
  ADD COLUMN banner_type text NOT NULL DEFAULT 'info',
  ADD COLUMN starts_at timestamptz DEFAULT NULL,
  ADD COLUMN expires_at timestamptz DEFAULT NULL,
  ADD COLUMN priority integer NOT NULL DEFAULT 5,
  ADD COLUMN target_all boolean NOT NULL DEFAULT false,
  ADD COLUMN max_views integer DEFAULT NULL;

-- Add dismissed_at to chat_banner_assignments
ALTER TABLE public.chat_banner_assignments
  ADD COLUMN dismissed_at timestamptz DEFAULT NULL;
