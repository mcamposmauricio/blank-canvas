
ALTER TABLE public.brand_settings
ADD COLUMN IF NOT EXISTS nps_widget_position text DEFAULT 'right',
ADD COLUMN IF NOT EXISTS nps_widget_primary_color text DEFAULT '#8B5CF6';
