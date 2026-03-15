import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Send, TrendingUp, MessageSquare, Search, Mail, Building2, User } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { NPSHeatMap } from "@/components/NPSHeatMap";
import { PageHeader } from "@/components/ui/page-header";
import { sanitizeFilterValue } from "@/lib/utils";

interface Stats {
  totalContacts: number;
  totalCampaigns: number;
  totalResponses: number;
  responses24h: number;
  responses7d: number;
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_company: boolean;
  company_document: string | null;
  company_sector: string | null;
}

interface ContactResponse {
  id: string;
  score: number;
  comment: string | null;
  responded_at: string;
  campaigns: {
    name: string;
  };
}

interface ContactCampaign {
  campaign_id: string;
  email_sent: boolean;
  campaigns: {
    name: string;
    status: string;
  };
}

interface RecentResponse {
  id: string;
  score: number;
  comment: string | null;
  responded_at: string;
  contact_id: string;
  campaign_id: string;
  contacts: {
    name: string;
    email: string;
    is_company: boolean;
  };
  campaigns: {
    name: string;
  };
}

interface CampaignStats {
  id: string;
  name: string;
  totalResponses: number;
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    totalCampaigns: 0,
    totalResponses: 0,
    responses24h: 0,
    responses7d: 0,
    npsScore: 0,
    promoters: 0,
    passives: 0,
    detractors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactResponses, setContactResponses] = useState<ContactResponse[]>([]);
  const [contactCampaigns, setContactCampaigns] = useState<ContactCampaign[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [recentResponses, setRecentResponses] = useState<RecentResponse[]>([]);
  const [viewMode, setViewMode] = useState<"campaign" | "contact">("campaign");
  const [campaignStats, setCampaignStats] = useState<CampaignStats[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [filteredStats, setFilteredStats] = useState<Stats | null>(null);
  const [filteredResponses, setFilteredResponses] = useState<RecentResponse[]>([]);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [contactsRes, campaignsRes, responsesRes] = await Promise.all([
          supabase.from("contacts").select("id", { count: "exact" }),
          supabase.from("campaigns").select("id", { count: "exact" }).in("status", ["active", "sent"]),
          supabase
            .from("responses")
            .select("score, responded_at"),
        ]);

        const responses = responsesRes.data || [];
        
        // Calculate time-based responses
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const responses24h = responses.filter((r) => new Date(r.responded_at) >= last24h).length;
        const responses7d = responses.filter((r) => new Date(r.responded_at) >= last7d).length;
        
        const promoters = responses.filter((r) => r.score >= 9).length;
        const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
        const detractors = responses.filter((r) => r.score <= 6).length;
        const total = responses.length;
        const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

        setStats({
          totalContacts: contactsRes.count || 0,
          totalCampaigns: campaignsRes.count || 0,
          totalResponses: total,
          responses24h,
          responses7d,
          npsScore,
          promoters,
          passives,
          detractors,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentResponses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("responses")
          .select(`
            id,
            score,
            comment,
            responded_at,
            contact_id,
            campaign_id,
            contacts (
              name,
              email,
              is_company
            ),
            campaigns (
              name
            )
          `)
          .order("responded_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setRecentResponses(data || []);
      } catch (error) {
        console.error("Error fetching recent responses:", error);
      }
    };

    const fetchCampaignStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, name")
          .in("status", ["active", "sent"]);

        if (!campaigns) return;

        const campaignIds = campaigns.map((c) => c.id);
        const { data: allResponses } = await supabase
          .from("responses")
          .select("score, campaign_id")
          .in("campaign_id", campaignIds);

        const responsesByCampaign = new Map<string, { score: number }[]>();
        (allResponses || []).forEach((r) => {
          const list = responsesByCampaign.get(r.campaign_id) || [];
          list.push({ score: r.score });
          responsesByCampaign.set(r.campaign_id, list);
        });

        const campaignStatsData = campaigns.map((campaign) => {
          const responsesData = responsesByCampaign.get(campaign.id) || [];
          const promoters = responsesData.filter((r) => r.score >= 9).length;
          const passives = responsesData.filter((r) => r.score >= 7 && r.score <= 8).length;
          const detractors = responsesData.filter((r) => r.score <= 6).length;
          const total = responsesData.length;
          const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

          return {
            id: campaign.id,
            name: campaign.name,
            totalResponses: total,
            npsScore,
            promoters,
            passives,
            detractors,
          };
        });

        setCampaignStats(campaignStatsData);
      } catch (error) {
        console.error("Error fetching campaign stats:", error);
      }
    };

    fetchStats();
    fetchRecentResponses();
    fetchCampaignStats();
  }, []);

  useEffect(() => {
    const fetchFilteredData = async () => {
      if (!selectedCampaignId) {
        setFilteredStats(null);
        setFilteredResponses([]);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch responses for the selected campaign
        const { data: responses } = await supabase
          .from("responses")
          .select(`
            id,
            score,
            comment,
            responded_at,
            contact_id,
            campaign_id,
            contacts (
              name,
              email,
              is_company
            ),
            campaigns (
              name
            )
          `)
          .eq("campaign_id", selectedCampaignId)
          .order("responded_at", { ascending: false });

        const responsesData = responses || [];
        setFilteredResponses(responsesData);

        // Calculate time-based responses
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const responses24h = responsesData.filter((r) => new Date(r.responded_at) >= last24h).length;
        const responses7d = responsesData.filter((r) => new Date(r.responded_at) >= last7d).length;

        // Calculate filtered stats
        const promoters = responsesData.filter((r) => r.score >= 9).length;
        const passives = responsesData.filter((r) => r.score >= 7 && r.score <= 8).length;
        const detractors = responsesData.filter((r) => r.score <= 6).length;
        const total = responsesData.length;
        const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

        // Get unique contacts for this campaign
        const { count: contactsCount } = await supabase
          .from("campaign_contacts")
          .select("contact_id", { count: "exact", head: true })
          .eq("campaign_id", selectedCampaignId);

        setFilteredStats({
          totalContacts: contactsCount || 0,
          totalCampaigns: 1,
          totalResponses: total,
          responses24h,
          responses7d,
          npsScore,
          promoters,
          passives,
          detractors,
        });
      } catch (error) {
        console.error("Error fetching filtered data:", error);
      }
    };

    fetchFilteredData();
  }, [selectedCampaignId]);

  useEffect(() => {
    const searchContacts = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const sanitized = sanitizeFilterValue(searchTerm);
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error: any) {
        console.error("Error searching contacts:", error);
      }
    };

    const debounce = setTimeout(searchContacts, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const fetchContactDetails = async (contact: Contact) => {
    setSelectedContact(contact);
    setDetailsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch responses
      const { data: responsesData } = await supabase
        .from("responses")
        .select(`
          id,
          score,
          comment,
          responded_at,
          campaigns (
            name
          )
        `)
        .eq("contact_id", contact.id)
        .order("responded_at", { ascending: false })
        .limit(5);

      // Fetch campaign associations
      const { data: campaignsData } = await supabase
        .from("campaign_contacts")
        .select(`
          campaign_id,
          email_sent,
          campaigns (
            name,
            status
          )
        `)
        .eq("contact_id", contact.id);

      setContactResponses(responsesData || []);
      setContactCampaigns(campaignsData || []);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-success";
    if (score >= 7) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return t("dashboard.promoters");
    if (score >= 7) return t("dashboard.neutrals");
    return t("dashboard.detractors");
  };

  const displayStats = viewMode === "campaign" && selectedCampaignId && filteredStats ? filteredStats : stats;
  
  const statCards = [
    { title: t("dashboard.contacts"), value: displayStats.totalContacts, icon: Users, color: "text-blue-600" },
    { title: t("dashboard.activeCampaigns"), value: displayStats.totalCampaigns, icon: Send, color: "text-purple-600" },
    { title: t("dashboard.npsScore"), value: displayStats.npsScore, icon: TrendingUp, color: "text-primary", suffix: "" },
    { title: t("dashboard.responsesTotal"), value: displayStats.totalResponses, icon: MessageSquare, color: "text-indigo-600" },
    { title: t("dashboard.responses24h"), value: displayStats.responses24h, icon: MessageSquare, color: "text-green-600" },
    { title: t("dashboard.responses7d"), value: displayStats.responses7d, icon: MessageSquare, color: "text-cyan-600" },
  ];

  const pendingCampaigns = contactCampaigns.filter(cc => !cc.email_sent);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.npsHistory")} />

        {/* View Mode Filter */}
        <Card className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap flex-1">
              <div>
                <h2 className="text-lg font-semibold">{t("dashboard.viewModeTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("dashboard.viewModeDescription")}</p>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "campaign" | "contact")}>
                <TabsList>
                  <TabsTrigger value="campaign">{t("dashboard.byCampaign")}</TabsTrigger>
                  <TabsTrigger value="contact">{t("dashboard.byContact")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {viewMode === "campaign" && campaignStats.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedCampaignId ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedCampaignId(null)}
                  >
                    {t("dashboard.clearFilter")}
                  </Button>
                ) : (
                  <>
                    <label className="text-sm text-muted-foreground whitespace-nowrap">{t("dashboard.filterByCampaign")}</label>
                    <select
                      className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={selectedCampaignId || ""}
                      onChange={(e) => setSelectedCampaignId(e.target.value || null)}
                    >
                      <option value="">{t("dashboard.allCampaigns")}</option>
                      {campaignStats.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        {viewMode === "contact" && (
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("dashboard.searchContact")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      fetchContactDetails(contact);
                      setSearchTerm("");
                      setSearchResults([]);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {contact.is_company ? (
                        <Building2 className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">{t("dashboard.viewDetails")}</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-3xl font-bold">
                  {stat.value}
                  {stat.suffix !== undefined ? stat.suffix : ""}
                </p>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{t("dashboard.promoters")}</h3>
                <span className="text-2xl">😊</span>
              </div>
              <p className="text-4xl font-bold text-success">{displayStats.promoters}</p>
              <p className="text-sm text-muted-foreground mt-2">Score 9-10</p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{t("dashboard.neutrals")}</h3>
                <span className="text-2xl">😐</span>
              </div>
              <p className="text-4xl font-bold text-warning">{displayStats.passives}</p>
              <p className="text-sm text-muted-foreground mt-2">Score 7-8</p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{t("dashboard.detractors")}</h3>
                <span className="text-2xl">😞</span>
              </div>
              <p className="text-4xl font-bold text-destructive">{displayStats.detractors}</p>
              <p className="text-sm text-muted-foreground mt-2">Score 0-6</p>
            </Card>
          </div>

          {displayStats.totalResponses > 0 && (
            <Card className="p-6 bg-gradient-to-br from-background via-card to-muted/20 shadow-lg border-primary/10">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                {t("dashboard.responseDistribution")}
              </h3>
              <div className="h-80">
                  <ChartContainer config={{
                  promoters: { label: t("dashboard.promoters"), color: "hsl(var(--promoter))" },
                  passives: { label: t("dashboard.neutrals"), color: "hsl(var(--passive))" },
                  detractors: { label: t("dashboard.detractors"), color: "hsl(var(--detractor))" },
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.2"/>
                        </filter>
                      </defs>
                      <Pie
                        data={[
                          { name: t("dashboard.promoters"), value: displayStats.promoters, label: '😊' },
                          { name: t("dashboard.neutrals"), value: displayStats.passives, label: '😐' },
                          { name: t("dashboard.detractors"), value: displayStats.detractors, label: '😞' },
                        ]}
                        cx="50%"
                        cy="45%"
                        labelLine={{
                          stroke: "hsl(var(--border))",
                          strokeWidth: 2,
                        }}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, label }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 30;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          
                          return (
                            <text 
                              x={x} 
                              y={y} 
                              fill="hsl(var(--foreground))" 
                              textAnchor={x > cx ? 'start' : 'end'} 
                              dominantBaseline="central"
                              className="font-semibold text-sm"
                            >
                              {`${label} ${name}`}
                              <tspan x={x} dy="1.2em" className="text-xs font-normal">
                                {`${(percent * 100).toFixed(1)}%`}
                              </tspan>
                            </text>
                          );
                        }}
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                        filter="url(#shadow)"
                      >
                        <Cell fill="hsl(var(--promoter))" stroke="hsl(var(--background))" strokeWidth={3} />
                        <Cell fill="hsl(var(--passive))" stroke="hsl(var(--background))" strokeWidth={3} />
                        <Cell fill="hsl(var(--detractor))" stroke="hsl(var(--background))" strokeWidth={3} />
                      </Pie>
                      <ChartTooltip 
                        content={<ChartTooltipContent 
                          labelFormatter={(_, payload) => {
                            if (payload && payload[0]) {
                              return payload[0].name;
                            }
                            return "";
                          }}
                        />} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </Card>
          )}
        </div>

        {/* Recent Responses or Campaign Stats */}
        {viewMode === "campaign" && selectedCampaignId && filteredResponses.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Send className="h-6 w-6" />
              {t("dashboard.campaignResponses")}
            </h2>
            <div className="space-y-2">
              {filteredResponses.map((response) => (
                <div
                  key={response.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {response.contacts.is_company ? (
                      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{response.contacts.name}</p>
                        <span className="text-xs text-muted-foreground truncate">{response.contacts.email}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(response.responded_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                      {response.comment && (
                        <p className="text-xs text-muted-foreground italic mt-1 line-clamp-1">
                          &ldquo;{response.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`ml-3 px-2 py-1 rounded ${getScoreColor(response.score)} flex-shrink-0`}>
                    <div className="text-center">
                      <div className="text-lg font-bold">{response.score}</div>
                      <div className="text-xs whitespace-nowrap">{getScoreLabel(response.score)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {viewMode === "contact" && (
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              {t("dashboard.latestResponses")}
            </h2>
            {recentResponses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t("dashboard.noResponses")}
              </p>
            ) : (
              <div className="space-y-3">
                {recentResponses.map((response) => (
                  <div
                    key={response.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/nps/campaigns/${response.campaign_id}`)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {response.contacts.is_company ? (
                        <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{response.contacts.name}</p>
                          <span className="text-xs text-muted-foreground truncate">{response.contacts.email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {t("dashboard.campaign")} {response.campaigns.name}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(response.responded_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        {response.comment && (
                          <p className="text-sm text-muted-foreground italic mt-1 line-clamp-1">
                            &ldquo;{response.comment}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`ml-4 px-3 py-2 rounded-lg border ${getScoreColor(response.score)} flex-shrink-0`}>
                      <div className="text-center">
                        <div className="text-xl font-bold">{response.score}</div>
                        <div className="text-xs whitespace-nowrap">{getScoreLabel(response.score)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* NPS Heatmap by Region */}
        <NPSHeatMap campaignId={viewMode === "campaign" ? selectedCampaignId : null} />
      </div>

      {/* Contact Details Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedContact?.is_company ? (
                <Building2 className="h-6 w-6 text-primary" />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
              <div>
                <div className="text-xl font-bold">{selectedContact?.name}</div>
                <div className="text-sm text-muted-foreground font-normal">{selectedContact?.email}</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedContact?.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("dashboard.phone")}</label>
                    <p className="text-sm">{selectedContact.phone}</p>
                  </div>
                )}
                {selectedContact?.is_company && selectedContact?.company_document && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("dashboard.document")}</label>
                    <p className="text-sm">{selectedContact.company_document}</p>
                  </div>
                )}
                {selectedContact?.is_company && selectedContact?.company_sector && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("dashboard.sector")}</label>
                    <p className="text-sm">{selectedContact.company_sector}</p>
                  </div>
                )}
              </div>

              {/* Pending Campaigns */}
              {pendingCampaigns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    {t("dashboard.pendingCampaigns")} ({pendingCampaigns.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingCampaigns.map((cc) => (
                      <div key={cc.campaign_id} className="p-3 border rounded-lg bg-orange-50">
                        <p className="font-medium">{cc.campaigns.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("dashboard.status")} {cc.campaigns.status === "sent" ? t("dashboard.sent") : t("dashboard.draft")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest Responses */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t("dashboard.latestResponses")} ({contactResponses.length})
                </h3>
                {contactResponses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("dashboard.noResponses")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {contactResponses.map((response) => (
                      <div key={response.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{response.campaigns.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(response.responded_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getScoreColor(response.score)}`}>
                              {response.score}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getScoreLabel(response.score)}
                            </div>
                          </div>
                        </div>
                        {response.comment && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm italic">
                            &ldquo;{response.comment}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Dashboard;