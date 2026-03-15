
-- Create chat_broadcasts table
CREATE TABLE public.chat_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create chat_broadcast_recipients table
CREATE TABLE public.chat_broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.chat_broadcasts(id) ON DELETE CASCADE,
  company_contact_id uuid REFERENCES public.company_contacts(id),
  contact_id uuid REFERENCES public.contacts(id),
  tenant_id uuid REFERENCES public.tenants(id),
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  delivered_at timestamptz,
  clicked_at timestamptz,
  chat_room_id uuid REFERENCES public.chat_rooms(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_broadcasts
CREATE POLICY "Tenant members can manage broadcasts"
  ON public.chat_broadcasts FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS policies for chat_broadcast_recipients
CREATE POLICY "Tenant members can manage broadcast recipients"
  ON public.chat_broadcast_recipients FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Auto-set tenant_id triggers
CREATE TRIGGER set_broadcast_tenant_id
  BEFORE INSERT ON public.chat_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- Updated_at trigger
CREATE TRIGGER update_broadcasts_updated_at
  BEFORE UPDATE ON public.chat_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_broadcasts;
