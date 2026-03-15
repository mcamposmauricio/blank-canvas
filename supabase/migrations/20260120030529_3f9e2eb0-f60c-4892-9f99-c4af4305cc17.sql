-- Create user_email_settings table
CREATE TABLE public.user_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'default',
  gmail_client_id TEXT,
  gmail_client_secret TEXT,
  gmail_refresh_token TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  smtp_from_name TEXT,
  smtp_secure BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_notification_settings table
CREATE TABLE public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  notify_on_response BOOLEAN DEFAULT false,
  notify_email TEXT,
  notify_promoters BOOLEAN DEFAULT true,
  notify_neutrals BOOLEAN DEFAULT true,
  notify_detractors BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.user_email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_email_settings
CREATE POLICY "Users can view their own email settings"
ON public.user_email_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email settings"
ON public.user_email_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email settings"
ON public.user_email_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email settings"
ON public.user_email_settings
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for user_notification_settings
CREATE POLICY "Users can view their own notification settings"
ON public.user_notification_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
ON public.user_notification_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
ON public.user_notification_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings"
ON public.user_notification_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE TRIGGER update_user_email_settings_updated_at
BEFORE UPDATE ON public.user_email_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at
BEFORE UPDATE ON public.user_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();