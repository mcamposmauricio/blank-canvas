-- Add company fields and custom fields to contacts
ALTER TABLE public.contacts
ADD COLUMN company_document TEXT,
ADD COLUMN company_sector TEXT,
ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;

-- Create brand_settings table for visual customization
CREATE TABLE public.brand_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#8B5CF6',
  secondary_color TEXT DEFAULT '#EC4899',
  accent_color TEXT DEFAULT '#10B981',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on brand_settings
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for brand_settings
CREATE POLICY "Users can view their own brand settings"
ON public.brand_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand settings"
ON public.brand_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand settings"
ON public.brand_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand settings"
ON public.brand_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for brand_settings updated_at
CREATE TRIGGER update_brand_settings_updated_at
BEFORE UPDATE ON public.brand_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Create policies for logo uploads
CREATE POLICY "Users can view all logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Users can upload their own logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);