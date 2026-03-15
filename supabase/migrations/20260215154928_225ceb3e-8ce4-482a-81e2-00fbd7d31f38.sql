
CREATE POLICY "Admins can upload any logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update any logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND public.has_role(auth.uid(), 'admin')
);
