-- Add brand_name to brand_settings to identify different brand configurations
ALTER TABLE public.brand_settings 
ADD COLUMN brand_name text NOT NULL DEFAULT 'Default Brand';

-- Add brand_settings_id to campaigns to link campaigns to specific brand configurations
ALTER TABLE public.campaigns 
ADD COLUMN brand_settings_id uuid REFERENCES public.brand_settings(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_campaigns_brand_settings ON public.campaigns(brand_settings_id);

-- Remove unique constraint on user_id in brand_settings to allow multiple brands per user
-- (There's no explicit unique constraint, so we're good to go)