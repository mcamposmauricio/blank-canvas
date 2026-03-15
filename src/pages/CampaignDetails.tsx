import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Check, User, Building2, Code2, Download, Mail, Trash2, Send, Users, TrendingUp, BarChart3, MessageSquare, Filter, Plus, XCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { QuickContactForm } from "@/components/QuickContactForm";
import { getStatusLabel, getStatusColor } from "@/utils/campaignUtils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportToCSV } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { CampaignScheduler } from "@/components/CampaignScheduler";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_company: boolean;
  company_document: string | null;
  company_sector: string | null;
}

interface ContactWithPrimary extends Contact {
  primary_contact_name?: string;
  primary_contact_email?: string;
  display_name: string;
  display_email: string;
}

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_primary: boolean;
}

interface CampaignContact {
  id: string;
  link_token: string;
  contact_id: string;
  company_contact_id: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  contacts: Contact;
  company_contacts: CompanyContact | null;
  nps_score?: number | null;
  // Computed fields for display
  display_name: string;
  display_email: string;
}

interface CampaignStats {
  total: number;
  sent: number;
  responded: number;
  pending: number;
  avgScore: number;
  nps: number;
}

interface Response {
  id: string;
  score: number;
  comment: string | null;
  responded_at: string;
  contact_id: string;
  contacts: Contact;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  created_at: string;
  campaign_type: string;
  start_date: string | null;
  next_send: string | null;
  cycle_type: string | null;
  attempts_total: number | null;
  attempt_current: number | null;
  brand_settings_id: string | null;
  send_channels: string[] | null;
}

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([]);
  const [allContacts, setAllContacts] = useState<ContactWithPrimary[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedEmbedToken, setCopiedEmbedToken] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [stats, setStats] = useState<CampaignStats>({ total: 0, sent: 0, responded: 0, pending: 0, avgScore: 0, nps: 0 });
  const [addContactsDialogOpen, setAddContactsDialogOpen] = useState(false);
  const [selectedNewContactIds, setSelectedNewContactIds] = useState<string[]>([]);
  const [addingContacts, setAddingContacts] = useState(false);
  const [responses, setResponses] = useState<Response[]>([]);
  const [filters, setFilters] = useState({
    emailStatus: 'all', // 'all', 'sent', 'pending'
    responseStatus: 'all', // 'all', 'responded', 'not_responded'
    npsCategory: 'all', // 'all', 'promoter', 'passive', 'detractor'
  });
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [cancellingCampaign, setCancellingCampaign] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();
  const { hasPermission } = useAuth();
  const canEditNps = hasPermission('nps', 'edit');
  const canDeleteNps = hasPermission('nps', 'delete');
  const canManageNps = hasPermission('nps', 'manage');

  useEffect(() => {
    fetchCampaignDetails();
    fetchAllContacts();
  }, [id]);

  useEffect(() => {
    calculateFilteredStats();
  }, [campaignContacts, filters]);

  const fetchCampaignDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch campaign contacts with contact details and company contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from("campaign_contacts")
        .select(`
          id,
          link_token,
          contact_id,
          company_contact_id,
          email_sent,
          email_sent_at,
          contacts (
            id,
            name,
            email,
            phone,
            is_company,
            company_document,
            company_sector
          ),
          company_contacts (
            id,
            name,
            email,
            phone,
            is_primary
          )
        `)
        .eq("campaign_id", id);

      if (contactsError) throw contactsError;

      // For each contact, if no company_contact is linked, try to find the primary contact
      const contactIds = [...new Set((contactsData || []).map(cc => cc.contact_id))];
      
      // Fetch primary company contacts for all companies
      const { data: primaryContacts } = await supabase
        .from("company_contacts")
        .select("id, company_id, name, email, phone, is_primary")
        .in("company_id", contactIds)
        .eq("is_primary", true);

      const primaryContactsMap = new Map(
        (primaryContacts || []).map(pc => [pc.company_id, pc])
      );
      
      // Fetch responses to get NPS scores and stats
      const { data: responsesData } = await supabase
        .from("responses")
        .select("contact_id, score")
        .eq("campaign_id", id);
      
      // Create a map of contact_id to score
      const scoresMap = new Map(responsesData?.map(r => [r.contact_id, r.score]) || []);
      
      // Add NPS scores and determine display email/name
      const contactsWithScores = (contactsData || []).map(cc => {
        // Determine which contact to use for email
        let companyContact = cc.company_contacts;
        
        // If no specific company contact linked, use primary contact
        if (!companyContact) {
          const primaryContact = primaryContactsMap.get(cc.contact_id);
          if (primaryContact) {
            companyContact = primaryContact;
          }
        }
        
        // Display name and email: use company contact if available, otherwise company
        const display_name = companyContact ? companyContact.name : cc.contacts.name;
        const display_email = companyContact ? companyContact.email : cc.contacts.email;
        
        return {
          ...cc,
          company_contacts: companyContact || null,
          nps_score: scoresMap.get(cc.contact_id) || null,
          display_name,
          display_email,
        };
      });
      
      setCampaignContacts(contactsWithScores);

      const respondedContactIds = new Set(responsesData?.map(r => r.contact_id) || []);
      
      // Calculate stats
      const total = contactsWithScores.length;
      const sent = contactsWithScores.filter(c => c.email_sent).length;
      const responded = contactsWithScores.filter(c => respondedContactIds.has(c.contact_id)).length;
      const pending = total - sent;
      
      // Calculate average score and NPS
      let avgScore = 0;
      let nps = 0;
      
      if (responsesData && responsesData.length > 0) {
        const scores = responsesData.map(r => r.score);
        avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        // Calculate NPS (Net Promoter Score)
        const promoters = scores.filter(s => s >= 9).length;
        const detractors = scores.filter(s => s <= 6).length;
        nps = ((promoters - detractors) / scores.length) * 100;
      }
      
      setStats({ total, sent, responded, pending, avgScore, nps });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateLink = (token: string) => {
    return `${window.location.origin}/nps/${token}`;
  };

  const generateEmbedCode = (token: string) => {
    const link = generateLink(token);
    return `<iframe src="${link}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  const copyLink = (token: string) => {
    const link = generateLink(token);
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({
      title: "Link copiado!",
      description: "Link individual copiado para área de transferência.",
    });
  };

  const copyEmbedCode = (token: string) => {
    const embedCode = generateEmbedCode(token);
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbedToken(token);
    setTimeout(() => setCopiedEmbedToken(null), 2000);
    toast({
      title: "Código embed copiado!",
      description: "Código de incorporação copiado para área de transferência.",
    });
  };

  const handleExportCSV = () => {
    const csvData = campaignContacts.map((cc) => ({
      "Tipo": cc.contacts.is_company ? "Empresa" : "Pessoa",
      "Empresa": cc.contacts.name,
      "Contato": cc.display_name,
      "Email Campanha": cc.display_email,
      "Email Empresa": cc.contacts.email,
      "Telefone": cc.contacts.phone || "",
      "Documento": cc.contacts.company_document || "",
      "Setor": cc.contacts.company_sector || "",
      "Link NPS": generateLink(cc.link_token),
      "Código Embed": generateEmbedCode(cc.link_token),
    }));
    exportToCSV(csvData, `campanha_${campaign?.name || 'contatos'}`);
    toast({
      title: "CSV exportado!",
      description: "Arquivo baixado com sucesso.",
    });
  };

  const sendNPSReminder = async (contactId: string) => {
    const campaignContact = campaignContacts.find(cc => cc.contact_id === contactId);
    if (!campaignContact || !campaign) return;

    setSendingEmail(contactId);
    
    try {
      // Fetch brand settings based on campaign's brand_settings_id
      const { data: { user } } = await supabase.auth.getUser();
      
      let brandSettingsQuery = supabase
        .from("brand_settings")
        .select("company_name");
      
      if (campaign.brand_settings_id) {
        brandSettingsQuery = brandSettingsQuery.eq("id", campaign.brand_settings_id);
      } else {
        brandSettingsQuery = brandSettingsQuery.limit(1);
      }
      
      const { data: brandSettings } = await brandSettingsQuery.maybeSingle();

      const { error } = await supabase.functions.invoke("send-nps-reminder", {
        body: {
          contactName: campaignContact.display_name,
          contactEmail: campaignContact.display_email,
          campaignName: campaign.name,
          campaignMessage: campaign.message,
          npsLink: generateLink(campaignContact.link_token),
          companyName: brandSettings?.company_name || undefined,
          language: language,
        },
      });

      if (error) throw error;

      // Update email_sent status
      await supabase
        .from("campaign_contacts")
        .update({ 
          email_sent: true, 
          email_sent_at: new Date().toISOString() 
        })
        .eq("id", campaignContact.id);

      // If campaign has embedded channel and is not live, activate it
      let widgetActivated = false;
      if (campaign.send_channels?.includes('embedded') && campaign.status !== 'live') {
        await supabase
          .from("campaigns")
          .update({ status: 'live' })
          .eq("id", campaign.id);
        widgetActivated = true;
      }

      toast({
        title: widgetActivated ? "E-mail enviado e widget ativado!" : "E-mail enviado!",
        description: widgetActivated 
          ? `Lembrete enviado para ${campaignContact.display_name}. O widget NPS também foi ativado.`
          : `Lembrete enviado para ${campaignContact.display_name} (${campaignContact.display_email})`,
      });

      // Refresh data
      await fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingEmail(null);
    }
  };

  const sendBulkReminders = async () => {
    if (selectedContacts.length === 0) return;

    setSendingBulk(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let brandSettingsQuery = supabase
        .from("brand_settings")
        .select("company_name");
      
      if (campaign?.brand_settings_id) {
        brandSettingsQuery = brandSettingsQuery.eq("id", campaign.brand_settings_id);
      } else {
        brandSettingsQuery = brandSettingsQuery.limit(1);
      }
      
      const { data: brandSettings } = await brandSettingsQuery.maybeSingle();

      for (const contactId of selectedContacts) {
        const campaignContact = campaignContacts.find(cc => cc.contact_id === contactId);
        if (!campaignContact || !campaign) continue;

        try {
          const { error } = await supabase.functions.invoke("send-nps-reminder", {
            body: {
              contactName: campaignContact.display_name,
              contactEmail: campaignContact.display_email,
              campaignName: campaign.name,
              campaignMessage: campaign.message,
              npsLink: generateLink(campaignContact.link_token),
              companyName: brandSettings?.company_name || undefined,
              language: language,
            },
          });

          if (error) throw error;

          // Update email_sent status
          await supabase
            .from("campaign_contacts")
            .update({ 
              email_sent: true, 
              email_sent_at: new Date().toISOString() 
            })
            .eq("id", campaignContact.id);

          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Error sending to ${campaignContact.display_email}:`, error);
        }
      }

      // If campaign has embedded channel and is not live, activate it after first successful send
      let widgetActivated = false;
      if (successCount > 0 && campaign?.send_channels?.includes('embedded') && campaign?.status !== 'live') {
        await supabase
          .from("campaigns")
          .update({ status: 'live' })
          .eq("id", campaign.id);
        widgetActivated = true;
      }

      toast({
        title: widgetActivated ? "Envio concluído e widget ativado!" : "Envio em massa concluído",
        description: widgetActivated 
          ? `${successCount} e-mails enviados. O widget NPS também foi ativado para esta campanha.`
          : `${successCount} e-mails enviados com sucesso${errorCount > 0 ? `, ${errorCount} falharam` : ''}`,
      });

      setSelectedContacts([]);
      await fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: "Erro no envio em massa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingBulk(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    const campaignContact = campaignContacts.find(cc => cc.id === contactId);
    if (!campaignContact) return;

    try {
      const { error } = await supabase
        .from("campaign_contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      toast({
        title: "Contato removido",
        description: "Contato removido da campanha com sucesso",
      });

      await fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: "Erro ao remover contato",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setContactToDelete(null);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    const filteredContacts = getFilteredContacts();
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(cc => cc.contact_id));
    }
  };

  const fetchAllContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all contacts (companies)
      const { data: contactsData, error } = await supabase
        .from("contacts")
        .select("id, name, email, phone, is_company, company_document, company_sector")
        .order("name", { ascending: true });

      if (error) throw error;

      // Fetch primary contacts for all companies
      const contactIds = (contactsData || []).map(c => c.id);
      const { data: primaryContacts } = await supabase
        .from("company_contacts")
        .select("company_id, name, email")
        .in("company_id", contactIds)
        .eq("is_primary", true);

      const primaryContactsMap = new Map(
        (primaryContacts || []).map(pc => [pc.company_id, pc])
      );

      // Enrich contacts with primary contact info
      const enrichedContacts: ContactWithPrimary[] = (contactsData || []).map(contact => {
        const primaryContact = primaryContactsMap.get(contact.id);
        return {
          ...contact,
          primary_contact_name: primaryContact?.name,
          primary_contact_email: primaryContact?.email,
          display_name: primaryContact?.name || contact.name,
          display_email: primaryContact?.email || contact.email,
        };
      });

      setAllContacts(enrichedContacts);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
    }
  };

  const openAddContactsDialog = () => {
    setSelectedNewContactIds([]);
    setShowNewContactForm(false);
    setAddContactsDialogOpen(true);
  };

  const handleNewContactToggle = (contactId: string) => {
    setSelectedNewContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleAddNewContacts = async () => {
    if (!id || selectedNewContactIds.length === 0) return;
    setAddingContacts(true);

    try {
      const inserts = selectedNewContactIds.map((contactId) => ({
        campaign_id: id,
        contact_id: contactId,
      }));

      const { error } = await supabase
        .from("campaign_contacts")
        .insert(inserts);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `${selectedNewContactIds.length} contato(s) adicionado(s) à campanha.`,
      });

      setAddContactsDialogOpen(false);
      setSelectedNewContactIds([]);
      await fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAddingContacts(false);
    }
  };

  const getNpsCategory = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return 'none';
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
  };

  const calculateFilteredStats = () => {
    let filtered = [...campaignContacts];

    // Filter by email status
    if (filters.emailStatus === 'sent') {
      filtered = filtered.filter(cc => cc.email_sent);
    } else if (filters.emailStatus === 'pending') {
      filtered = filtered.filter(cc => !cc.email_sent);
    }

    // Filter by response status
    if (filters.responseStatus === 'responded') {
      filtered = filtered.filter(cc => cc.nps_score !== null && cc.nps_score !== undefined);
    } else if (filters.responseStatus === 'not_responded') {
      filtered = filtered.filter(cc => cc.nps_score === null || cc.nps_score === undefined);
    }

    // Filter by NPS category
    if (filters.npsCategory !== 'all') {
      filtered = filtered.filter(cc => {
        const category = getNpsCategory(cc.nps_score);
        return category === filters.npsCategory;
      });
    }

    // Calculate stats from filtered data
    const total = filtered.length;
    const sent = filtered.filter(c => c.email_sent).length;
    const responded = filtered.filter(c => c.nps_score !== null && c.nps_score !== undefined).length;
    const pending = total - sent;

    let avgScore = 0;
    let nps = 0;

    const scores = filtered
      .filter(c => c.nps_score !== null && c.nps_score !== undefined)
      .map(c => c.nps_score!);

    if (scores.length > 0) {
      avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const promoters = scores.filter(s => s >= 9).length;
      const detractors = scores.filter(s => s <= 6).length;
      nps = ((promoters - detractors) / scores.length) * 100;
    }

    setStats({ total, sent, responded, pending, avgScore, nps });
  };

  const getFilteredContacts = (): CampaignContact[] => {
    let filtered = [...campaignContacts];

    if (filters.emailStatus === 'sent') {
      filtered = filtered.filter(cc => cc.email_sent);
    } else if (filters.emailStatus === 'pending') {
      filtered = filtered.filter(cc => !cc.email_sent);
    }

    if (filters.responseStatus === 'responded') {
      filtered = filtered.filter(cc => cc.nps_score !== null && cc.nps_score !== undefined);
    } else if (filters.responseStatus === 'not_responded') {
      filtered = filtered.filter(cc => cc.nps_score === null || cc.nps_score === undefined);
    }

    if (filters.npsCategory !== 'all') {
      filtered = filtered.filter(cc => {
        const category = getNpsCategory(cc.nps_score);
        return category === filters.npsCategory;
      });
    }

    return filtered;
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-success/10 text-success border-success/20";
    if (score >= 7) return "bg-warning/10 text-warning border-warning/20";
    return "bg-destructive/10 text-destructive border-destructive/20";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "Promotor";
    if (score >= 7) return "Neutro";
    return "Detrator";
  };

  const availableContacts = allContacts.filter(
    contact => !campaignContacts.some(cc => cc.contact_id === contact.id)
  );

  const isScheduledCampaign = campaign?.status === 'scheduled' || campaign?.status === 'live';
  const canAddContacts = campaign?.campaign_type === 'manual' || !isScheduledCampaign;

  const handleCancelCampaign = async () => {
    if (!campaign) return;
    
    setCancellingCampaign(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: 'cancelled' })
        .eq("id", campaign.id);

      if (error) throw error;

      toast({
        title: "Campanha cancelada",
        description: "A campanha foi cancelada com sucesso. Todos os agendamentos foram interrompidos.",
      });

      await fetchCampaignDetails();
      setShowCancelDialog(false);
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar campanha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancellingCampaign(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Campanha não encontrada.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold mb-2">{campaign.name}</h1>
              <p className="text-muted-foreground">{campaign.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManageNps && campaign.status !== 'cancelled' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar Campanha
              </Button>
            )}
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(campaign.status)}`}>
              {getStatusLabel(campaign.status)}
            </span>
          </div>
        </div>

        <CampaignScheduler campaign={campaign} onUpdate={fetchCampaignDetails} />

        {/* Warning for scheduled campaigns */}
        {!canAddContacts && (
          <Card className="p-4 border-warning bg-warning/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-warning mb-1">Campanha Agendada</h3>
                <p className="text-sm text-muted-foreground">
                  Esta campanha já está agendada e ativa. Não é possível adicionar novos contatos a campanhas agendadas. 
                  Para adicionar novos contatos, pause a campanha primeiro ou crie uma nova campanha.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status de Envio</label>
              <Select value={filters.emailStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, emailStatus: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status de Resposta</label>
              <Select value={filters.responseStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, responseStatus: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="responded">Respondidos</SelectItem>
                  <SelectItem value="not_responded">Não Respondidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Categoria NPS</label>
              <Select value={filters.npsCategory} onValueChange={(value) => setFilters(prev => ({ ...prev, npsCategory: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="promoter">Promotores (9-10)</SelectItem>
                  <SelectItem value="passive">Neutros (7-8)</SelectItem>
                  <SelectItem value="detractor">Detratores (0-6)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Users className="h-4 w-4" />
              <span>Total</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Mail className="h-4 w-4" />
              <span>Enviados</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <MessageSquare className="h-4 w-4" />
              <span>Respostas</span>
            </div>
            <div className="text-2xl font-bold text-success">{stats.responded}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Send className="h-4 w-4" />
              <span>Pendentes</span>
            </div>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>NPS Score</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {stats.nps > 0 ? Math.round(stats.nps) : "-"}
            </div>
          </Card>
        </div>

        {/* Chart Section */}
        {stats.responded > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Distribuição de Respostas
              </h3>
              <div className="h-64">
                <ChartContainer config={{
                  promoters: { label: "Promotores", color: "hsl(var(--success))" },
                  passives: { label: "Neutros", color: "hsl(var(--warning))" },
                  detractors: { label: "Detratores", color: "hsl(var(--destructive))" },
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { 
                        name: 'NPS', 
                        promoters: campaignContacts.filter(cc => cc.nps_score && cc.nps_score >= 9).length,
                        passives: campaignContacts.filter(cc => cc.nps_score && cc.nps_score >= 7 && cc.nps_score <= 8).length,
                        detractors: campaignContacts.filter(cc => cc.nps_score && cc.nps_score <= 6).length,
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="promoters" fill="var(--color-promoters)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="passives" fill="var(--color-passives)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="detractors" fill="var(--color-detractors)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Status de Envios
              </h3>
              <div className="h-64">
                <ChartContainer config={{
                  sent: { label: "Enviados", color: "hsl(var(--primary))" },
                  pending: { label: "Pendentes", color: "hsl(var(--muted))" },
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Enviados', value: stats.sent },
                          { name: 'Pendentes', value: stats.pending },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </Card>
          </div>
        )}

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Contatos da Campanha ({getFilteredContacts().length})
            </h2>
            <div className="flex gap-2">
              {canEditNps && (
                <Button 
                  onClick={openAddContactsDialog} 
                  variant="outline" 
                  size="sm"
                  disabled={!canAddContacts}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Adicionar Contatos
                </Button>
              )}
              {canEditNps && selectedContacts.length > 0 && (
                <Button 
                  onClick={sendBulkReminders} 
                  disabled={sendingBulk}
                  size="sm"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendingBulk ? "Enviando..." : `Enviar para ${selectedContacts.length}`}
                </Button>
              )}
              {campaignContacts.length > 0 && (
                <Button onClick={handleExportCSV} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              )}
            </div>
          </div>
          
          {getFilteredContacts().length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {campaignContacts.length === 0 
                ? "Nenhum contato adicionado a esta campanha ainda."
                : "Nenhum contato corresponde aos filtros selecionados."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedContacts.length === getFilteredContacts().length && getFilteredContacts().length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>NPS</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredContacts().map((cc) => (
                    <TableRow key={cc.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedContacts.includes(cc.contact_id)}
                          onCheckedChange={() => toggleContactSelection(cc.contact_id)}
                        />
                      </TableCell>
                      <TableCell>
                        {cc.contacts.is_company ? (
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-xs">Empresa</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs">Pessoa</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{cc.display_name}</span>
                          {cc.contacts.is_company && cc.company_contacts && (
                            <span className="text-xs text-muted-foreground">
                              {cc.contacts.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{cc.display_email}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          cc.email_sent 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {cc.email_sent ? "Enviado" : "Pendente"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {cc.nps_score !== null && cc.nps_score !== undefined ? (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${getScoreColor(cc.nps_score)}`}>
                            <span className="font-bold">{cc.nps_score}</span>
                            <span className="text-xs">{getScoreLabel(cc.nps_score)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {cc.email_sent_at 
                            ? new Date(cc.email_sent_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyLink(cc.link_token)}
                          >
                            {copiedToken === cc.link_token ? (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="mr-2 h-4 w-4" />
                                Link
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyEmbedCode(cc.link_token)}
                          >
                            {copiedEmbedToken === cc.link_token ? (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Code2 className="mr-2 h-4 w-4" />
                                Embed
                              </>
                            )}
                          </Button>
                          {canEditNps && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => sendNPSReminder(cc.contact_id)}
                              disabled={sendingEmail === cc.contact_id || cc.email_sent}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              {sendingEmail === cc.contact_id ? "Enviando..." : cc.email_sent ? "Enviado" : "Enviar"}
                            </Button>
                          )}
                          {canDeleteNps && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setContactToDelete(cc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={!!contactToDelete} onOpenChange={() => setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contato da campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o contato desta campanha e excluirá o link gerado. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => contactToDelete && handleDeleteContact(contactToDelete)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addContactsDialogOpen} onOpenChange={setAddContactsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Contatos à Campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableContacts.length === 0 && allContacts.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">Você ainda não tem contatos cadastrados.</p>
                <Button variant="outline" onClick={() => setShowNewContactForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Contato
                </Button>
              </div>
            ) : showNewContactForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                  <h3 className="font-semibold">Criar Novo Contato</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewContactForm(false)}>
                    Voltar para Lista
                  </Button>
                </div>
                <QuickContactForm
                  onSuccess={() => {
                    setShowNewContactForm(false);
                    fetchAllContacts();
                    fetchCampaignDetails();
                  }}
                  onCancel={() => setShowNewContactForm(false)}
                />
              </div>
            ) : (
              <>
                {availableContacts.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-muted-foreground">Todos os seus contatos já estão nesta campanha.</p>
                    <Button variant="outline" onClick={() => setShowNewContactForm(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Novo Contato
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between pb-2">
                      <p className="text-sm text-muted-foreground">
                        Selecione os contatos que deseja adicionar
                      </p>
                      <Button variant="outline" size="sm" onClick={() => setShowNewContactForm(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Contato
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {availableContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleNewContactToggle(contact.id)}
                        >
                          <Checkbox
                            checked={selectedNewContactIds.includes(contact.id)}
                            onCheckedChange={() => handleNewContactToggle(contact.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{contact.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {contact.primary_contact_name ? (
                                <>
                                  <span className="truncate">{contact.primary_contact_name}</span>
                                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                                    Principal
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Sem contato principal</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{contact.display_email}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {contact.is_company ? "Empresa" : "Pessoa"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={handleAddNewContacts}
                      className="w-full"
                      disabled={addingContacts || selectedNewContactIds.length === 0}
                    >
                      {addingContacts
                        ? "Adicionando..."
                        : `Adicionar ${selectedNewContactIds.length} Contato(s)`}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá cancelar a campanha e interromper todos os envios agendados. 
              As respostas já recebidas serão mantidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelCampaign}
              disabled={cancellingCampaign}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancellingCampaign ? "Cancelando..." : "Sim, Cancelar Campanha"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CampaignDetails;
