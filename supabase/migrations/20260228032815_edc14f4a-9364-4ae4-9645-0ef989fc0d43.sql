
-- Create help-images bucket for article image uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('help-images', 'help-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload help images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'help-images' AND auth.role() = 'authenticated');

-- Allow public read access
CREATE POLICY "Public can view help images"
ON storage.objects FOR SELECT
USING (bucket_id = 'help-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update help images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'help-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete help images"
ON storage.objects FOR DELETE
USING (bucket_id = 'help-images' AND auth.role() = 'authenticated');
