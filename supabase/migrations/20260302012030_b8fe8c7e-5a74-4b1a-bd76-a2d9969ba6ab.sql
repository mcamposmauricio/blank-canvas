
ALTER TABLE public.help_site_settings
  ADD COLUMN IF NOT EXISTS hero_image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hero_overlay_opacity integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS header_bg_color text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS header_links_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_logo_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS footer_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS footer_links_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_social_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_bg_color text DEFAULT '#111827';
