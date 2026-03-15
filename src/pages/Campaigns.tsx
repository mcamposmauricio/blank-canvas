import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Calendar, Clock, Trash2, Users, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStatusLabel, getStatusColor, getCycleLabel, formatDate } from "@/utils/campaignUtils";
import { useAuth } from "@/hooks/useAuth";
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

import { exportToCSV } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CampaignForm } from "@/components/CampaignForm";

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  campaign_type: 'manual' | 'automatic';
  start_date: string | null;
  cycle_type: 'weekly' | 'biweekly' | null;
  attempts_total: number | null;
  attempt_current: number;
  next_send: string | null;
}


const Campaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(5);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [totalContacts, setTotalContacts] = useState(0);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const canEditNps = hasPermission('nps.campaigns', 'edit');
  const canDeleteNps = hasPermission('nps.campaigns', 'delete');

  useEffect(() => {
    fetchCampaigns();
    fetchContactsCount();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as Campaign[]);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContactsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from("contacts")
        .select("*", { count: 'exact', head: true });

      if (error) throw error;
      setTotalContacts(count || 0);
    } catch (error: any) {
      console.error("Error fetching contacts count:", error);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return;

    // Extra safety: block deletion for active (live) campaigns
    const selected = campaigns.find((c) => c.id === campaignToDelete);
    if (selected?.status === 'live') {
      toast({
        title: t("campaigns.deleteError"),
        description: t("campaigns.deleteBlockedActive"),
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete in correct order: responses -> campaign_sends -> campaign_contacts -> campaigns
      await supabase.from("responses").delete().eq("campaign_id", campaignToDelete);
      await supabase.from("campaign_sends").delete().eq("campaign_id", campaignToDelete);
      await supabase.from("campaign_contacts").delete().eq("campaign_id", campaignToDelete);
      
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignToDelete);

      if (error) throw error;

      toast({
        title: t("campaigns.deleteSuccess"),
      });

      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: t("campaigns.deleteError"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

  const handleExportCSV = () => {
    const csvData = campaigns.map((campaign) => ({
      [t("campaigns.name")]: campaign.name,
      [t("campaignForm.messageLabel")]: campaign.message,
      [t("campaigns.status")]: getStatusLabel(campaign.status),
      [t("campaigns.created")]: new Date(campaign.created_at).toLocaleDateString(),
      [t("campaigns.scheduledFor")]: campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString() : "",
    }));
    exportToCSV(csvData, "campaigns");
    toast({
      title: t("contacts.exportSuccess"),
      description: t("contacts.exportDescription"),
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("campaigns.title")}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span>{t("campaigns.totalCampaigns")}: {campaigns.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{t("campaigns.totalContacts")}: {totalContacts}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {campaigns.length > 0 && (
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t("contacts.export")}
              </Button>
            )}
            {canEditNps && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("campaigns.createCampaign")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t("campaignForm.title")}</DialogTitle>
                  </DialogHeader>
                  <CampaignForm
                    onSuccess={() => {
                      setDialogOpen(false);
                      fetchCampaigns();
                    }}
                    onCancel={() => setDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>


        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">{t("campaigns.noCampaigns")}</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-3">
              {campaigns.slice(0, displayCount).map((campaign) => (
                <Card 
                  key={campaign.id} 
                  className="overflow-hidden hover:shadow-md transition-all hover:border-primary/20"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/nps/campaigns/${campaign.id}`)}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold truncate">{campaign.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                              {getStatusLabel(campaign.status)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                              {campaign.campaign_type === 'automatic' ? t("campaigns.automatic") : t("campaigns.manual")}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{t("campaigns.created")}: {new Date(campaign.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          {campaign.campaign_type === 'automatic' && campaign.next_send && campaign.status !== 'completed' && campaign.status !== 'cancelled' && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{t("campaigns.nextSend")}: {formatDate(campaign.next_send)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {canDeleteNps && campaign.status !== 'live' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCampaignToDelete(campaign.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {displayCount < campaigns.length && (
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setDisplayCount(prev => prev + 5)}
                >
                  {t("contacts.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("campaigns.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("campaigns.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCampaignToDelete(null)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCampaign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("campaigns.deleteCampaign")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Campaigns;
