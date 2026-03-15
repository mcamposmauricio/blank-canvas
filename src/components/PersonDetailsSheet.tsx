import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  Phone,
  Building2,
  Copy,
  MessageSquare,
  User,
  Briefcase,
  Hash,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { TimelineComponent } from "@/components/cs/TimelineComponent";
import { CustomFieldsDisplay } from "@/components/CustomFieldsDisplay";

interface PersonWithCompany {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_primary: boolean;
  public_token: string | null;
  chat_total: number | null;
  chat_avg_csat: number | null;
  chat_last_at: string | null;
  company_id: string;
  external_id: string | null;
  created_at: string | null;
  company_name: string;
  company_trade_name: string | null;
}

interface PersonDetailsSheetProps {
  person: PersonWithCompany | null;
  onClose: () => void;
}

export function PersonDetailsSheet({ person, onClose }: PersonDetailsSheetProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const dateLocale = language === "pt-BR" ? ptBR : enUS;

  // Fetch chat rooms for this contact
  const { data: chatRooms = [] } = useQuery({
    queryKey: ["person-chats", person?.id],
    queryFn: async () => {
      if (!person) return [];
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("id, status, created_at, closed_at, csat_score, csat_comment")
        .eq("company_contact_id", person.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!person,
  });

  // Fetch timeline events for the company
  const { data: timelineEvents = [] } = useQuery({
    queryKey: ["person-timeline", person?.company_id],
    queryFn: async () => {
      if (!person) return [];
      const { data, error } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("contact_id", person.company_id)
        .order("date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!person,
  });

  if (!person) return null;

  const portalUrl = `${window.location.origin}/portal/${person.public_token}`;

  const copyPortalLink = () => {
    if (!person.public_token) return;
    navigator.clipboard.writeText(portalUrl);
    toast({ title: t("people.linkCopied") });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="default">{t("people.chatStatus.active")}</Badge>;
      case "closed":
        return <Badge variant="secondary">{t("people.chatStatus.closed")}</Badge>;
      default:
        return <Badge variant="outline">{t("people.chatStatus.waiting")}</Badge>;
    }
  };

  return (
    <Sheet open={!!person} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-full shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl truncate">{person.name}</p>
              <p className="text-sm text-muted-foreground font-normal truncate">
                {person.email}
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview">{t("people.overview")}</TabsTrigger>
            <TabsTrigger value="chats">{t("people.chats")}</TabsTrigger>
            <TabsTrigger value="timeline">{t("people.timeline")}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Personal Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("people.personalInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{person.email}</span>
                </div>
                {person.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{person.phone}</span>
                  </div>
                )}
                {person.role && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{person.role}</span>
                  </div>
                )}
                {person.department && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{person.department}</span>
                  </div>
                )}
                {person.external_id && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{person.external_id}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("people.company")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {person.company_trade_name || person.company_name}
                  </span>
                  {person.is_primary && (
                    <Badge variant="secondary" className="text-xs">
                      {t("companies.primaryContact")}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Portal Link */}
            {person.public_token && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("people.portalLink")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {portalUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyPortalLink}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {t("people.copyLink")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Fields */}
            <CustomFieldsDisplay fields={(person as any).custom_fields} target="contact" />
            {/* Chat Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("people.chatMetrics")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("people.totalChats")}</span>
                  <span className="font-medium">{person.chat_total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("people.avgCsat")}</span>
                  <span className="font-medium">
                    {person.chat_avg_csat
                      ? `${Number(person.chat_avg_csat).toFixed(1)}/5`
                      : "-"}
                  </span>
                </div>
                {person.chat_last_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("people.lastChat")}</span>
                    <span className="font-medium">
                      {format(new Date(person.chat_last_at), "PPP", { locale: dateLocale })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chats Tab */}
          <TabsContent value="chats" className="mt-4">
            <ScrollArea className="h-[500px]">
              {chatRooms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t("people.noChatHistory")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatRooms.map((room) => (
                    <Card key={room.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(room.status)}
                              {room.csat_score && (
                                <Badge variant="outline">
                                  CSAT: {room.csat_score}/5
                                </Badge>
                              )}
                            </div>
                            {room.csat_comment && (
                              <p className="text-sm text-muted-foreground italic">
                                "{room.csat_comment}"
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {room.created_at &&
                              format(new Date(room.created_at), "PPP", {
                                locale: dateLocale,
                              })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-4">
            <TimelineComponent
              events={
                timelineEvents as Array<{
                  id: string;
                  type: string;
                  title: string;
                  description: string | null;
                  date: string;
                  user_name: string;
                  metadata: Record<string, unknown>;
                }>
              }
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
