
ALTER TABLE public.chat_banners ADD COLUMN content_html text;
ALTER TABLE public.chat_banners ADD COLUMN text_align text NOT NULL DEFAULT 'left';
