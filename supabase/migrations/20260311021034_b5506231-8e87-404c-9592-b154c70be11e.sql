ALTER TABLE public.chat_banners ADD COLUMN outbound_type text NOT NULL DEFAULT 'banner';
ALTER TABLE public.chat_banners ADD COLUMN page_html text DEFAULT NULL;