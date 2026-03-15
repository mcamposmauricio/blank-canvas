import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Palette, Mail, MessageSquare } from "lucide-react";

export default function GlobalSettings() {
  const { data: tenants = [] } = useQuery({
    queryKey: ["backoffice-tenants-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("id, name, is_active").order("name");
      return data ?? [];
    },
  });

  const { data: brandSettings = [] } = useQuery({
    queryKey: ["backoffice-brand-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("brand_settings").select("*");
      return data ?? [];
    },
  });

  const { data: emailSettings = [] } = useQuery({
    queryKey: ["backoffice-email-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("user_email_settings").select("*");
      return data ?? [];
    },
  });

  const { data: chatSettings = [] } = useQuery({
    queryKey: ["backoffice-chat-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_settings").select("*");
      return data ?? [];
    },
  });

  const getBrand = (tenantId: string) => brandSettings.find(b => b.tenant_id === tenantId);
  const getEmail = (tenantId: string) => emailSettings.find(e => e.tenant_id === tenantId);
  const getChat = (tenantId: string) => chatSettings.find(c => c.tenant_id === tenantId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configurações por Tenant</CardTitle>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum tenant encontrado</p>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {tenants.map(t => {
              const brand = getBrand(t.id);
              const email = getEmail(t.id);
              const chat = getChat(t.id);
              return (
                <AccordionItem key={t.id} value={t.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{t.name}</span>
                      <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs">
                        {t.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {/* Brand */}
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm"><Palette className="h-4 w-4" />Marca</div>
                      {brand ? (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Nome:</span> {brand.brand_name}</div>
                          <div><span className="text-muted-foreground">Empresa:</span> {brand.company_name || "—"}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Cor primária:</span>
                            {brand.primary_color && <span className="h-4 w-4 rounded-full border inline-block" style={{ backgroundColor: brand.primary_color }} />}
                            {brand.primary_color || "—"}
                          </div>
                          <div><span className="text-muted-foreground">Logo:</span> {brand.logo_url ? "✓" : "—"}</div>
                        </div>
                      ) : <p className="text-xs text-muted-foreground">Não configurado</p>}
                    </div>

                    {/* Email */}
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm"><Mail className="h-4 w-4" />Email</div>
                      {email ? (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Provider:</span> {email.provider}</div>
                          <div><span className="text-muted-foreground">SMTP Host:</span> {email.smtp_host || "—"}</div>
                          <div><span className="text-muted-foreground">From:</span> {email.smtp_from_email || "—"}</div>
                          <div><span className="text-muted-foreground">Verificado:</span> {email.is_verified ? "✓" : "✗"}</div>
                        </div>
                      ) : <p className="text-xs text-muted-foreground">Não configurado</p>}
                    </div>

                    {/* Chat */}
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm"><MessageSquare className="h-4 w-4" />Chat Widget</div>
                      {chat ? (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Empresa:</span> {chat.widget_company_name || "—"}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Cor:</span>
                            {chat.widget_primary_color && <span className="h-4 w-4 rounded-full border inline-block" style={{ backgroundColor: chat.widget_primary_color }} />}
                            {chat.widget_primary_color || "—"}
                          </div>
                          <div><span className="text-muted-foreground">Posição:</span> {chat.widget_position || "—"}</div>
                          <div><span className="text-muted-foreground">CSAT:</span> {chat.show_csat ? "Sim" : "Não"}</div>
                          <div><span className="text-muted-foreground">Anexos:</span> {chat.allow_file_attachments ? "Sim" : "Não"}</div>
                          <div><span className="text-muted-foreground">Auto-assign:</span> {chat.auto_assignment ? "Sim" : "Não"}</div>
                        </div>
                      ) : <p className="text-xs text-muted-foreground">Não configurado</p>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
