import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mail, Code2, Info } from "lucide-react";

interface CampaignFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CampaignForm = ({ onSuccess, onCancel }: CampaignFormProps) => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [brandSettingsId, setBrandSettingsId] = useState<string>('');
  const [brands, setBrands] = useState<Array<{ id: string; brand_name: string; company_name: string }>>([]);
  const [sendChannels, setSendChannels] = useState<string[]>(['email']);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brand_settings")
        .select("id, brand_name, company_name")
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setBrands(data);
        setBrandSettingsId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching brands:", error);
    }
  };

  const toggleChannel = (channel: string, checked: boolean) => {
    if (checked) {
      setSendChannels(prev => [...prev, channel]);
    } else {
      // Ensure at least one channel is selected
      if (sendChannels.length > 1) {
        setSendChannels(prev => prev.filter(c => c !== channel));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (sendChannels.length === 0) {
      toast({
        title: t("common.error"),
        description: t("campaigns.selectAtLeastOneChannel"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const campaignData = {
        user_id: user.id,
        name,
        message,
        brand_settings_id: brandSettingsId || null,
        campaign_type: 'manual',
        status: 'draft',
        send_channels: sendChannels,
      };

      const { error } = await supabase.from("campaigns").insert(campaignData);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Campanha criada com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>{t("campaigns.campaignName")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("campaigns.campaignNamePlaceholder")}
            required
          />
        </div>

        <div>
          <Label>{t("campaigns.message")}</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("campaigns.messagePlaceholder")}
            rows={4}
            required
          />
        </div>

        {brands.length > 0 && (
          <div>
            <Label>{t("campaigns.selectBrand")}</Label>
            <select
              value={brandSettingsId}
              onChange={(e) => setBrandSettingsId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.brand_name || brand.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Send Channels Selection */}
        <div className="space-y-3">
          <Label>{t("campaigns.sendChannels")}</Label>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Checkbox
                id="channel-email"
                checked={sendChannels.includes('email')}
                onCheckedChange={(checked) => toggleChannel('email', !!checked)}
              />
              <div className="space-y-1">
                <label htmlFor="channel-email" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Mail className="h-4 w-4 text-primary" />
                  {t("campaigns.channelEmail")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t("campaigns.channelEmailDescription")}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Checkbox
                id="channel-embedded"
                checked={sendChannels.includes('embedded')}
                onCheckedChange={(checked) => toggleChannel('embedded', !!checked)}
              />
              <div className="space-y-1">
                <label htmlFor="channel-embedded" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Code2 className="h-4 w-4 text-primary" />
                  {t("campaigns.channelEmbedded")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t("campaigns.channelEmbeddedDescription")}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {t("campaigns.channelHelp")}
            </p>
          </div>
        </div>

      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? t("campaigns.saving") : t("campaigns.createCampaign")}
        </Button>
      </div>
    </form>
  );
};
