import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import NPSForm from "@/components/NPSForm";

interface BrandSettings {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

const NPSResponse = () => {
  const { token } = useParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    company_name: null,
    logo_url: null,
    primary_color: "#8B5CF6",
    secondary_color: "#EC4899",
    accent_color: "#10B981",
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      if (!token) return;

      // Fetch campaign_contact by link_token
      const { data: campaignContact, error: ccError } = await supabase
        .from("campaign_contacts")
        .select(`
          campaign_id,
          contact_id,
          campaigns (
            user_id,
            brand_settings_id
          )
        `)
        .eq("link_token", token)
        .single();

      if (ccError) throw ccError;
      if (!campaignContact) {
        toast({
          title: t("nps.response.invalidLink"),
          description: t("nps.response.invalidLinkDesc"),
          variant: "destructive",
        });
        return;
      }

      setCampaignData(campaignContact);

      // Fetch brand settings based on campaign's brand_settings_id
      const campaigns = campaignContact.campaigns as any;
      const brandSettingsId = campaigns.brand_settings_id;
      
      let settingsQuery = supabase.from("brand_settings").select("*");
      
      if (brandSettingsId) {
        settingsQuery = settingsQuery.eq("id", brandSettingsId);
      } else {
        settingsQuery = settingsQuery.eq("user_id", campaigns.user_id);
      }
      
      const { data: settings } = await settingsQuery.maybeSingle();

      if (settings) {
        setBrandSettings(settings);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: t("nps.response.error"),
        description: t("nps.response.errorDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (score: number, comment: string) => {
    if (!token || !campaignData) return;

    setSubmitting(true);

    try {
      // Check for duplicate response
      const { data: existing } = await supabase
        .from("responses")
        .select("id")
        .eq("campaign_id", campaignData.campaign_id)
        .eq("contact_id", campaignData.contact_id)
        .maybeSingle();

      if (existing) {
        setSubmitted(true);
        toast({
          title: t("nps.response.thanks"),
          description: t("nps.response.alreadyResponded"),
        });
        return;
      }

      const { error } = await supabase.from("responses").insert({
        campaign_id: campaignData.campaign_id,
        contact_id: campaignData.contact_id,
        score,
        comment: comment || null,
        token,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: t("nps.response.thanks"),
        description: t("nps.response.successDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("nps.response.error"),
        description: error.message || t("nps.response.errorSubmit"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t("nps.response.invalidLink")}</h1>
          <p className="text-muted-foreground">{t("nps.response.invalidLinkDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <NPSForm
      brandSettings={brandSettings}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitted={submitted}
    />
  );
};

export default NPSResponse;
