ALTER TABLE public.chat_category_field_rules
  ADD COLUMN field_source text NOT NULL DEFAULT 'custom',
  ADD COLUMN operator text NOT NULL DEFAULT 'equals';