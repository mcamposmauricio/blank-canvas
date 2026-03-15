-- Add is_company field to contacts table
ALTER TABLE public.contacts 
ADD COLUMN is_company boolean NOT NULL DEFAULT false;