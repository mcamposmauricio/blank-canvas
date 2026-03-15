-- Add external_id to contacts for external system mapping
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_id text;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_contacts_external_id ON contacts(external_id);

-- Unique constraint per user (each user has their own external_ids namespace)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_user_external_id 
  ON contacts(user_id, external_id) 
  WHERE external_id IS NOT NULL;

-- Add send_channels array to campaigns (supports multiple: 'email', 'embedded')
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS send_channels text[] DEFAULT ARRAY['email'];

-- Add embedded tracking columns to campaign_contacts
ALTER TABLE campaign_contacts 
  ADD COLUMN IF NOT EXISTS embedded_viewed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS embedded_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_channel text;

-- Create api_keys table for widget authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_keys
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
  ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON api_keys FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on api_keys
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();