import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Route as RouteIcon,
  Clock,
  MessageSquare,
  Copy,
  Pencil,
  Hash,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { TimelineComponent } from "@/components/cs/TimelineComponent";
import { NPSTrailCard } from "@/components/cs/NPSTrailCard";
import { CompanyContactsList } from "@/components/CompanyContactsList";
import { CompanyContactForm } from "@/components/CompanyContactForm";
import { PersonDetailsSheet } from "@/components/PersonDetailsSheet";
import { CustomFieldsDisplay } from "@/components/CustomFieldsDisplay";

interface CompanyDetailsSheetProps {
  companyId: string | null;
  companyName?: string;
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_primary: boolean;
  created_at: string;
  external_id: string | null;
  public_token: string | null;
}

interface Trail {
  id: string;
  name: string;
  status: string;
  type: string;
  progress_percentage: number | null;
  started_at: string | null;
  completed_at: string | null;
  campaign_id: string | null;
  metadata: Record<string, unknown> | null;
}

export function CompanyDetailsSheet({
  companyId,
  onClose,
  onEdit,
  canEdit = true,
  canDelete = true,
}: CompanyDetailsSheetProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const dateLocale = language === "pt-BR" ? ptBR : enUS;
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [editContactData, setEditContactData] = useState<CompanyContact | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  // Fetch company data
  const { data: company } = useQuery({
    queryKey: ["company-details", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch contacts
  const { data: contacts = [], refetch: refetchContacts } = useQuery({
    queryKey: ["company-contacts-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_contacts")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at");
      if (error) throw error;
      return (data || []) as CompanyContact[];
    },
    enabled: !!companyId,
  });

  // Fetch trails
  const { data: trails = [] } = useQuery({
    queryKey: ["company-trails", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("trails")
        .select("*")
        .eq("contact_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Trail[];
    },
    enabled: !!companyId,
  });

  // Fetch NPS history
  const { data: npsHistory = [] } = useQuery({
    queryKey: ["company-nps-history", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("responses")
        .select(`id, score, comment, responded_at, campaign_id, campaigns (name)`)
        .eq("contact_id", companyId)
        .order("responded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch timeline
  const { data: timelineEvents = [] } = useQuery({
    queryKey: ["company-timeline", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("contact_id", companyId)
        .order("date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("companyDetails.copied") });
  };

  const handleAddContact = async (data: any) => {
    if (!companyId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("auth.error"));

      if (data.is_primary) {
        await supabase
          .from("company_contacts")
          .update({ is_primary: false })
          .eq("company_id", companyId);
      }

      const { error } = await supabase.from("company_contacts").insert({
        company_id: companyId,
        user_id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        role: data.role || null,
        department: data.department || null,
        is_primary: data.is_primary || contacts.length === 0,
        external_id: data.external_id || null,
        custom_fields: data.custom_fields && Object.keys(data.custom_fields).length > 0 ? data.custom_fields : {},
      } as any);

      if (error) throw error;
      toast({ title: t("common.success"), description: t("contacts.addSuccess") });
      setAddContactDialogOpen(false);
      refetchContacts();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const handleEditContact = async (data: any) => {
    if (!companyId || !editContactData) return;
    try {
      if (data.is_primary && !editContactData.is_primary) {
        await supabase
          .from("company_contacts")
          .update({ is_primary: false })
          .eq("company_id", companyId);
      }

      const { error } = await supabase
        .from("company_contacts")
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          role: data.role || null,
          department: data.department || null,
          is_primary: data.is_primary,
          external_id: data.external_id || null,
          custom_fields: data.custom_fields && Object.keys(data.custom_fields).length > 0 ? data.custom_fields : {},
        } as any)
        .eq("id", editContactData.id);

      if (error) throw error;
      toast({ title: t("common.success"), description: t("companies.updateSuccess") });
      setEditContactData(null);
      refetchContacts();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from("company_contacts")
        .delete()
        .eq("id", contactId);
      if (error) throw error;
      toast({ title: t("common.success"), description: t("contacts.deleteSuccess") });
      refetchContacts();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    if (!companyId) return;
    try {
      await supabase
        .from("company_contacts")
        .update({ is_primary: false })
        .eq("company_id", companyId);
      const { error } = await supabase
        .from("company_contacts")
        .update({ is_primary: true })
        .eq("id", contactId);
      if (error) throw error;
      refetchContacts();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const handleContactClick = (contact: CompanyContact) => {
    if (!company) return;
    setSelectedPerson({
      ...contact,
      company_id: company.id,
      company_name: company.name,
      company_trade_name: company.trade_name,
      chat_total: null,
      chat_avg_csat: null,
      chat_last_at: null,
    });
  };

  if (!companyId || !company) return null;

  const healthScore = company.health_score ?? 50;
  const npsTrails = trails.filter((t) => t.type === "nps");
  const otherTrails = trails.filter((t) => t.type !== "nps");

  const getHealthColor = (score: number) => {
    if (score >= 70) return "bg-primary";
    if (score >= 40) return "bg-warning";
    return "bg-destructive";
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getNPSClassification = (score: number) => {
    if (score >= 9) return { label: t("cs.npsTrail.promoter"), color: "bg-primary text-primary-foreground" };
    if (score >= 7) return { label: t("cs.npsTrail.passive"), color: "bg-warning text-warning-foreground" };
    return { label: t("cs.npsTrail.detractor"), color: "bg-destructive text-destructive-foreground" };
  };

  const truncateId = (id: string) => `${id.slice(0, 8)}...${id.slice(-4)}`;

  return (
    <>
      <Sheet open={!!companyId} onOpenChange={() => onClose()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-start justify-between">
              <div>
                <p className="text-xl">{company.trade_name || company.name}</p>
                {company.trade_name && company.trade_name !== company.name && (
                  <p className="text-sm text-muted-foreground font-normal">{company.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`${getHealthColor(healthScore)} text-primary-foreground`}
                >
                  <Heart className="h-3 w-3 mr-1" />
                  {healthScore}%
                </Badge>
                {canEdit && onEdit && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="overview">{t("cs.details.overview")}</TabsTrigger>
              <TabsTrigger value="contacts">
                <Users className="h-3 w-3 mr-1" />
                {contacts.length}
              </TabsTrigger>
              <TabsTrigger value="nps">NPS</TabsTrigger>
              <TabsTrigger value="trails">{t("cs.details.trails")}</TabsTrigger>
              <TabsTrigger value="timeline">{t("cs.details.timeline")}</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* System ID */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("companyDetails.integration")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("companyDetails.systemId")}</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                        {truncateId(company.id)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(company.id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {(company as any).external_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">ID Externo</span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                          {(company as any).external_id}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard((company as any).external_id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("cs.details.contact")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{company.email}</span>
                  </div>
                  {company.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {company.company_document && (
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span>CNPJ: {company.company_document}</span>
                    </div>
                  )}
                  {company.company_sector && (
                    <Badge variant="secondary" className="text-xs">{company.company_sector}</Badge>
                  )}
                  {(company as any).service_priority && (company as any).service_priority !== 'normal' && (
                    <Badge variant="outline" className="text-xs">
                      {t(`chat.categories.priority${((company as any).service_priority as string).charAt(0).toUpperCase() + ((company as any).service_priority as string).slice(1)}`)}
                    </Badge>
                  )}
                  {(company.city || company.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{[company.city, company.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Custom Fields */}
            <CustomFieldsDisplay fields={(company as any).custom_fields} target="company" />
              {/* Financial Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("cs.details.financial")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MRR</span>
                    <span className="font-medium">{formatCurrency(company.mrr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("cs.details.contractValue")}</span>
                    <span className="font-medium">{formatCurrency(company.contract_value)}</span>
                  </div>
                  {company.renewal_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("cs.details.renewalDate")}</span>
                      <span className="font-medium">
                        {format(new Date(company.renewal_date), "PPP", { locale: dateLocale })}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Last NPS */}
              {company.last_nps_score !== null && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t("cs.details.lastNPS")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        <span className="text-2xl font-bold">{company.last_nps_score}</span>
                        <Badge className={getNPSClassification(company.last_nps_score).color}>
                          {getNPSClassification(company.last_nps_score).label}
                        </Badge>
                      </div>
                      {company.last_nps_date && (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(company.last_nps_date), "PPP", { locale: dateLocale })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="mt-4">
              <CompanyContactsList
                contacts={contacts}
                onAddContact={() => setAddContactDialogOpen(true)}
                onEditContact={(contact) => setEditContactData(contact)}
                onDeleteContact={handleDeleteContact}
                onSetPrimary={handleSetPrimary}
                onContactClick={handleContactClick}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            </TabsContent>

            {/* NPS Tab */}
            <TabsContent value="nps" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {npsTrails.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">{t("cs.npsTrail.activeTrails")}</h3>
                      {npsTrails.map((trail) => (
                        <NPSTrailCard key={trail.id} trail={trail as any} />
                      ))}
                    </div>
                  )}
                  {npsHistory.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">{t("cs.npsTrail.responseHistory")}</h3>
                      {npsHistory.map((response: any) => {
                        const classification = getNPSClassification(response.score);
                        return (
                          <Card key={response.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">
                                    {response.campaigns?.name || t("cs.npsTrail.unknownCampaign")}
                                  </p>
                                  <Badge className={classification.color}>
                                    {response.score} - {classification.label}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {response.responded_at && format(new Date(response.responded_at), "PPP", { locale: dateLocale })}
                                </span>
                              </div>
                              {response.comment && (
                                <p className="text-sm text-muted-foreground mt-2 italic">"{response.comment}"</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  {npsTrails.length === 0 && npsHistory.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t("cs.npsTrail.noNPSData")}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Trails Tab */}
            <TabsContent value="trails" className="mt-4">
              <ScrollArea className="h-[400px]">
                {otherTrails.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RouteIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("cs.noTrails")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {otherTrails.map((trail) => (
                      <Card key={trail.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{trail.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={trail.status === "active" ? "default" : "secondary"}>
                                  {t(`cs.trailStatus.${trail.status}`)}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-lg font-bold">{trail.progress_percentage}%</span>
                          </div>
                          <Progress value={trail.progress_percentage ?? 0} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-2">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {trail.started_at && format(new Date(trail.started_at), "PPP", { locale: dateLocale })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-4">
              <TimelineComponent events={timelineEvents as Array<{
                id: string;
                type: string;
                title: string;
                description: string | null;
                date: string;
                user_name: string;
                metadata: Record<string, unknown>;
              }>} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Add Contact Dialog */}
      <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("companyContacts.add")}</DialogTitle>
          </DialogHeader>
          <CompanyContactForm
            onSubmit={handleAddContact}
            onCancel={() => setAddContactDialogOpen(false)}
            showPrimaryOption={contacts.length > 0}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editContactData} onOpenChange={(open) => !open && setEditContactData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("companyContacts.edit")}</DialogTitle>
          </DialogHeader>
          {editContactData && (
            <CompanyContactForm
              initialData={{
                name: editContactData.name,
                email: editContactData.email,
                phone: editContactData.phone || "",
                role: editContactData.role || "",
                department: editContactData.department || "",
                is_primary: editContactData.is_primary,
                external_id: editContactData.external_id || "",
                custom_fields: (editContactData as any).custom_fields || {},
              }}
              onSubmit={handleEditContact}
              onCancel={() => setEditContactData(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Person Details Sheet (overlay) */}
      <PersonDetailsSheet
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
      />
    </>
  );
}
