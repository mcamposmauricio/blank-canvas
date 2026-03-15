
-- Create chat-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Allow anyone to upload files (visitors are unauthenticated)
CREATE POLICY "Public upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow anyone to read files
CREATE POLICY "Public read chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');
