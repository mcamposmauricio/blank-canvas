import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { ImageUploadField } from "@/components/ui/image-upload-field";

interface LinkItem { label: string; url: string; }
interface SocialItem { type: string; url: string; }

export default function HelpSettings() {
  const { t } = useLanguage();
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [homeTitle, setHomeTitle] = useState("Central de Ajuda");
  const [homeSubtitle, setHomeSubtitle] = useState("Como podemos ajudar?");
  const [theme, setTheme] = useState("light");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [footerHtml, setFooterHtml] = useState("");
  const [contactChannels, setContactChannels] = useState("[]");

  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(50);
  const [faviconUrl, setFaviconUrl] = useState("");
  const [headerBgColor, setHeaderBgColor] = useState("#ffffff");
  const [headerLinks, setHeaderLinks] = useState<LinkItem[]>([]);
  const [footerLogoUrl, setFooterLogoUrl] = useState("");
  const [footerText, setFooterText] = useState("");
  const [footerBgColor, setFooterBgColor] = useState("#111827");
  const [footerLinks, setFooterLinks] = useState<LinkItem[]>([]);
  const [footerSocial, setFooterSocial] = useState<SocialItem[]>([]);

  useEffect(() => { if (tenantId) loadSettings(); }, [tenantId]);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("help_site_settings").select("*").eq("tenant_id", tenantId!).maybeSingle();
    if (data) {
      setHomeTitle(data.home_title || "");
      setHomeSubtitle(data.home_subtitle || "");
      setTheme(data.theme || "light");
      setLogoUrl(data.brand_logo_url || "");
      setPrimaryColor(data.brand_primary_color || "#3B82F6");
      setSecondaryColor(data.brand_secondary_color || "");
      setFooterHtml(data.footer_html || "");
      setContactChannels(JSON.stringify(data.contact_channels_json || [], null, 2));
      setHeroImageUrl((data as any).hero_image_url || "");
      setHeroOverlayOpacity((data as any).hero_overlay_opacity ?? 50);
      setFaviconUrl((data as any).favicon_url || "");
      setHeaderBgColor((data as any).header_bg_color || "#ffffff");
      setHeaderLinks((data as any).header_links_json || []);
      setFooterLogoUrl((data as any).footer_logo_url || "");
      setFooterText((data as any).footer_text || "");
      setFooterBgColor((data as any).footer_bg_color || "#111827");
      setFooterLinks((data as any).footer_links_json || []);
      setFooterSocial((data as any).footer_social_json || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);

    let channelsJson;
    try { channelsJson = JSON.parse(contactChannels); } catch { channelsJson = []; }

    await supabase.from("help_site_settings").upsert({
      tenant_id: tenantId,
      home_title: homeTitle,
      home_subtitle: homeSubtitle,
      theme,
      brand_logo_url: logoUrl || null,
      brand_primary_color: primaryColor,
      brand_secondary_color: secondaryColor || null,
      footer_html: footerHtml || null,
      contact_channels_json: channelsJson,
      hero_image_url: heroImageUrl || null,
      hero_overlay_opacity: heroOverlayOpacity,
      favicon_url: faviconUrl || null,
      header_bg_color: headerBgColor || "#ffffff",
      header_links_json: headerLinks,
      footer_logo_url: footerLogoUrl || null,
      footer_text: footerText || null,
      footer_bg_color: footerBgColor || "#111827",
      footer_links_json: footerLinks,
      footer_social_json: footerSocial,
    } as any);

    toast({ title: t("help.siteSaveSuccess") });
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("help.settings")} subtitle={t("help.title")}>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t("team.save")}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("help.publicHome")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("help.siteTitle")}</Label>
              <Input value={homeTitle} onChange={e => setHomeTitle(e.target.value)} placeholder={t("help.siteTitlePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.siteSubtitle")}</Label>
              <Input value={homeSubtitle} onChange={e => setHomeSubtitle(e.target.value)} placeholder={t("help.siteSubtitlePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.siteTheme")}</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Branding</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ImageUploadField
              value={logoUrl}
              onChange={setLogoUrl}
              label={t("help.siteLogo")}
              bucket="help-images"
              folder="logo"
              dimensions="200x60px"
              maxSizeMB={1}
              accept=".png,.svg,.webp"
              hint={t("imageUpload.transparentBg")}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("help.sitePrimaryColor")}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("help.siteSecondaryColor")}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={secondaryColor || "#6366f1"} onChange={e => setSecondaryColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t("help.siteHero")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ImageUploadField
              value={heroImageUrl}
              onChange={setHeroImageUrl}
              label={t("help.siteHeroImage")}
              bucket="help-images"
              folder="hero"
              dimensions="1920x400px"
              maxSizeMB={5}
              accept=".jpg,.png,.webp"
              previewMode="cover"
              previewHeight="h-24"
            />
            <div className="space-y-1.5">
              <Label>{t("help.siteHeroOverlay")}: {heroOverlayOpacity}%</Label>
              <Slider value={[heroOverlayOpacity]} onValueChange={v => setHeroOverlayOpacity(v[0])} min={0} max={100} step={5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t("help.siteHeader")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("help.siteHeaderBgColor")}</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={headerBgColor} onChange={e => setHeaderBgColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={headerBgColor} onChange={e => setHeaderBgColor(e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.siteHeaderLinks")}</Label>
              <LinkListEditor items={headerLinks} onChange={setHeaderLinks} addLabel={t("help.addLink")} labelPlaceholder={t("help.linkLabel")} urlPlaceholder={t("help.linkUrl")} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">{t("help.siteFooterSection")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImageUploadField
                value={footerLogoUrl}
                onChange={setFooterLogoUrl}
                label={t("help.siteFooterLogo")}
                bucket="help-images"
                folder="footer-logo"
                dimensions="200x60px"
                maxSizeMB={1}
                accept=".png,.svg,.webp"
              />
              <div className="space-y-1.5">
                <Label>{t("help.siteFooterText")}</Label>
                <Input value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="© 2025 Empresa" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.siteFooterBgColor")}</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={footerBgColor} onChange={e => setFooterBgColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={footerBgColor} onChange={e => setFooterBgColor(e.target.value)} className="flex-1 max-w-[200px]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.siteFooterLinks")}</Label>
              <LinkListEditor items={footerLinks} onChange={setFooterLinks} addLabel={t("help.addLink")} labelPlaceholder={t("help.linkLabel")} urlPlaceholder={t("help.linkUrl")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.siteFooterSocial")}</Label>
              <SocialListEditor items={footerSocial} onChange={setFooterSocial} addLabel={t("help.addSocial")} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">{t("help.siteAdvanced")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ImageUploadField
              value={faviconUrl}
              onChange={setFaviconUrl}
              label={t("help.siteFavicon")}
              bucket="help-images"
              folder="favicon"
              dimensions="32x32px ou 64x64px"
              maxSizeMB={0.5}
              accept=".png,.ico,.svg"
            />
            <div className="space-y-1.5">
              <Label>{t("help.siteFooter")} (Legacy HTML)</Label>
              <Textarea value={footerHtml} onChange={e => setFooterHtml(e.target.value)} rows={3} className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.siteContactChannels")} (JSON)</Label>
              <Textarea value={contactChannels} onChange={e => setContactChannels(e.target.value)} rows={3} className="font-mono text-xs" placeholder='[{"type": "email", "value": "suporte@empresa.com"}]' />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LinkListEditor({ items, onChange, addLabel, labelPlaceholder, urlPlaceholder }: {
  items: LinkItem[]; onChange: (v: LinkItem[]) => void; addLabel: string; labelPlaceholder: string; urlPlaceholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={item.label} onChange={e => { const n = [...items]; n[i] = { ...n[i], label: e.target.value }; onChange(n); }} placeholder={labelPlaceholder} className="flex-1" />
          <Input value={item.url} onChange={e => { const n = [...items]; n[i] = { ...n[i], url: e.target.value }; onChange(n); }} placeholder={urlPlaceholder} className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, { label: "", url: "" }])}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />{addLabel}
      </Button>
    </div>
  );
}

function SocialListEditor({ items, onChange, addLabel }: {
  items: SocialItem[]; onChange: (v: SocialItem[]) => void; addLabel: string;
}) {
  const types = ["linkedin", "twitter", "instagram", "facebook", "youtube"];
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Select value={item.type} onValueChange={v => { const n = [...items]; n[i] = { ...n[i], type: v }; onChange(n); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {types.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={item.url} onChange={e => { const n = [...items]; n[i] = { ...n[i], url: e.target.value }; onChange(n); }} placeholder="https://..." className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, { type: "linkedin", url: "" }])}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />{addLabel}
      </Button>
    </div>
  );
}
