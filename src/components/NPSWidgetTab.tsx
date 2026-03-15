import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Save, Copy, Check } from "lucide-react";
import NPSWidgetPreview from "@/components/NPSWidgetPreview";

const NPSWidgetTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [position, setPosition] = useState<"left" | "right">("right");
  const [primaryColor, setPrimaryColor] = useState("#8B5CF6");
  const [brandId, setBrandId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("brand_settings")
      .select("id, nps_widget_position, nps_widget_primary_color, primary_color")
      .maybeSingle();

    if (data) {
      setBrandId(data.id);
      setPosition(((data as any).nps_widget_position as "left" | "right") || "right");
      setPrimaryColor((data as any).nps_widget_primary_color || data.primary_color || "#8B5CF6");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: Record<string, any> = {
        nps_widget_position: position,
        nps_widget_primary_color: primaryColor,
      };

      if (brandId) {
        await supabase.from("brand_settings").update(payload as any).eq("id", brandId);
      } else {
        await supabase.from("brand_settings").insert({
          ...payload,
          user_id: user.id,
          brand_name: "Default Brand",
        } as any);
      }

      toast({ title: t("common.saved") });
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const baseUrl = window.location.origin;

  const snippets = {
    script: `<!-- NPS Widget - Auto-init -->
<script 
  src="${baseUrl}/nps-widget.js"
  data-api-key="SUA_NPS_API_KEY"
  data-external-id="CUSTOMER_EXTERNAL_ID"
></script>`,
    programmatic: `<!-- NPS Widget - Programmatic -->
<script src="${baseUrl}/nps-widget.js"></script>
<script>
  // Call this when your user logs in
  NPSWidget.init({
    apiKey: "SUA_NPS_API_KEY",
    externalId: loggedUser.id, // Your customer's ID
    position: "${position === "left" ? "bottom-left" : "bottom-right"}",
    onComplete: (data) => {
      console.log("NPS submitted:", data.score);
    }
  });
</script>`,
    iframe: `<!-- NPS Widget - iFrame -->
<iframe 
  src="${baseUrl}/embed?api_key=SUA_NPS_API_KEY&external_id=CUSTOMER_EXTERNAL_ID"
  style="position:fixed;bottom:20px;${position === "left" ? "left" : "right"}:20px;width:420px;height:400px;border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;"
></iframe>`,
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuração do Widget</CardTitle>
            <CardDescription>Personalize a aparência do widget NPS no site do cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cor primária</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-28"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Posição do widget</Label>
              <RadioGroup
                value={position}
                onValueChange={(v) => setPosition(v as "left" | "right")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="right" id="nps-pos-right" />
                  <Label htmlFor="nps-pos-right">Direita</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="left" id="nps-pos-left" />
                  <Label htmlFor="nps-pos-left">Esquerda</Label>
                </div>
              </RadioGroup>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <NPSWidgetPreview position={position} primaryColor={primaryColor} />
          </CardContent>
        </Card>
      </div>

      {/* Integration Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Código de Integração</CardTitle>
          <CardDescription>
            Copie o snippet abaixo e cole no HTML do seu site. Substitua <code className="text-xs bg-muted px-1 rounded">SUA_NPS_API_KEY</code> pela chave gerada na aba API Keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="script" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="script">Script</TabsTrigger>
              <TabsTrigger value="programmatic">Programático</TabsTrigger>
              <TabsTrigger value="iframe">iFrame</TabsTrigger>
            </TabsList>
            {(["script", "programmatic", "iframe"] as const).map((key) => (
              <TabsContent key={key} value={key}>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{snippets[key]}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => copyToClipboard(snippets[key], key)}
                  >
                    {copiedSnippet === key ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default NPSWidgetTab;
