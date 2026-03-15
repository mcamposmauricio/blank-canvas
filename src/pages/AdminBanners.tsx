import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthContext } from "@/contexts/AuthContext";
import { Plus, Edit, Trash2, Users, Eye, ThumbsUp, ThumbsDown, Search, Copy, Info, AlertTriangle, CheckCircle, Megaphone, Sparkles, CalendarIcon, Bell, Palette, Link2, Calendar as CalendarSectionIcon, Target, ChevronDown, Timer, Repeat, BarChart3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import BannerPreview, { BannerVariant, VARIANT_STYLES, TYPE_TO_VARIANT } from "@/components/chat/BannerPreview";
import BannerRichEditor from "@/components/chat/BannerRichEditor";
import BannerFieldRules from "@/components/chat/BannerFieldRules";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import BannerConflictDialog from "@/components/chat/BannerConflictDialog";

type BannerType = "info" | "warning" | "success" | "promo" | "update";
type OutboundType = "banner" | "page";

interface Banner {
  id: string;
  title: string;
  content: string;
  content_html: string | null;
  text_align: string;
  bg_color: string;
  text_color: string;
  link_url: string | null;
  link_label: string | null;
  has_voting: boolean;
  is_active: boolean;
  created_at: string;
  banner_type: BannerType;
  starts_at: string | null;
  expires_at: string | null;
  priority: number;
  target_all: boolean;
  auto_assign_by_rules: boolean;
  max_views: number | null;
  position: string;
  auto_dismiss_seconds: number | null;
  display_frequency: string;
  border_style: string;
  shadow_style: string;
  outbound_type: OutboundType;
  page_html: string | null;
}

interface FieldRule {
  id: string;
  banner_id: string;
  field_key: string;
  field_value: string;
  field_source: string;
  operator: string;
}

interface Assignment {
  id: string;
  contact_id: string;
  is_active: boolean;
  views_count: number;
  vote: string | null;
  dismissed_at: string | null;
  contact_name?: string;
  contact_email?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
}

interface Conflict {
  companyId: string;
  companyName: string;
  existingBannerId: string;
  existingBannerTitle: string;
  overlapStart: string;
  overlapEnd: string | null;
}

// Variant visual config for selector cards (9 presets + 1 custom)
const VARIANT_OPTIONS: { value: BannerVariant; label: string; bgPreview: string; borderClass: string }[] = [
  { value: "warning", label: "Alerta", bgPreview: "bg-amber-100", borderClass: "border-amber-300" },
  { value: "urgent", label: "Urgente", bgPreview: "bg-red-600", borderClass: "border-red-700" },
  { value: "success", label: "Sucesso", bgPreview: "bg-emerald-100", borderClass: "border-emerald-300" },
  { value: "neutral", label: "Neutro", bgPreview: "bg-slate-100", borderClass: "border-slate-300" },
  { value: "premium", label: "Premium", bgPreview: "bg-indigo-600", borderClass: "border-indigo-700" },
  { value: "ocean", label: "Oceano", bgPreview: "bg-gradient-to-r from-blue-500 to-violet-500", borderClass: "border-blue-400" },
  { value: "sunset", label: "Sunset", bgPreview: "bg-gradient-to-r from-orange-500 to-red-500", borderClass: "border-orange-400" },
  { value: "midnight", label: "Midnight", bgPreview: "bg-slate-900", borderClass: "border-slate-700" },
  { value: "neon", label: "Neon", bgPreview: "bg-gradient-to-r from-pink-500 to-cyan-500", borderClass: "border-pink-400" },
  { value: "custom", label: "Custom", bgPreview: "bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400", borderClass: "border-border" },
];

const BG_COLOR_PRESETS = [
  "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#06B6D4",
  "#EF4444", "#EC4899", "#F97316", "#1E293B", "#6B7280",
];

const TEXT_COLOR_PRESETS = [
  "#FFFFFF", "#000000", "#F8FAFC", "#1E293B", "#FEF3C7",
  "#ECFDF5", "#EFF6FF", "#F5F3FF", "#ECFEFF", "#FEE2E2",
];

const GRADIENT_PRESETS = [
  // Duo-color
  { name: "Ocean", value: "linear-gradient(135deg, #3B82F6, #8B5CF6)", group: "duo" },
  { name: "Sunset", value: "linear-gradient(135deg, #F97316, #EF4444)", group: "duo" },
  { name: "Emerald", value: "linear-gradient(135deg, #10B981, #06B6D4)", group: "duo" },
  { name: "Berry", value: "linear-gradient(135deg, #8B5CF6, #EC4899)", group: "duo" },
  { name: "Midnight", value: "linear-gradient(135deg, #1E293B, #3B82F6)", group: "duo" },
  { name: "Amber", value: "linear-gradient(135deg, #F59E0B, #F97316)", group: "duo" },
  { name: "Fuchsia", value: "linear-gradient(135deg, #EC4899, #8B5CF6)", group: "duo" },
  { name: "Teal", value: "linear-gradient(135deg, #06B6D4, #10B981)", group: "duo" },
  // Monocromáticos
  { name: "Blue", value: "linear-gradient(135deg, #93C5FD, #1D4ED8)", group: "mono" },
  { name: "Red", value: "linear-gradient(135deg, #FCA5A5, #B91C1C)", group: "mono" },
  { name: "Green", value: "linear-gradient(135deg, #86EFAC, #15803D)", group: "mono" },
  { name: "Purple", value: "linear-gradient(135deg, #C4B5FD, #6D28D9)", group: "mono" },
  { name: "Gray", value: "linear-gradient(135deg, #D1D5DB, #374151)", group: "mono" },
  { name: "Pink", value: "linear-gradient(135deg, #F9A8D4, #BE185D)", group: "mono" },
  { name: "Orange", value: "linear-gradient(135deg, #FDBA74, #C2410C)", group: "mono" },
  { name: "Cyan", value: "linear-gradient(135deg, #67E8F9, #0E7490)", group: "mono" },
];

const isGradient = (color: string) => color.startsWith("linear-gradient");
const bgStyle = (color: string) => isGradient(color) ? { background: color } : { backgroundColor: color };

const BANNER_TYPES: { value: BannerType; label: string; icon: typeof Info }[] = [
  { value: "info", label: "Informação", icon: Info },
  { value: "warning", label: "Alerta", icon: AlertTriangle },
  { value: "success", label: "Sucesso", icon: CheckCircle },
  { value: "promo", label: "Promoção", icon: Megaphone },
  { value: "update", label: "Atualização", icon: Sparkles },
];

const FREQUENCY_OPTIONS = [
  { value: "always", label: "Sempre" },
  { value: "once_per_session", label: "1x por sessão" },
  { value: "once_per_day", label: "1x por dia" },
];

const PRIORITY_LABELS: Record<number, string> = {
  1: "Baixa", 2: "Baixa", 3: "Baixa",
  4: "Média", 5: "Média", 6: "Média",
  7: "Alta", 8: "Alta",
  9: "Urgente", 10: "Urgente",
};

// WCAG contrast ratio calculation
function getLuminance(hex: string): number {
  const rgb = hex.replace("#", "").match(/.{2}/g)?.map(x => parseInt(x, 16) / 255) || [0, 0, 0];
  const [r, g, b] = rgb.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getContrastBadge(bgColor: string, textColor: string): { label: string; className: string } {
  const ratio = getContrastRatio(bgColor, textColor);
  if (ratio >= 7) return { label: "AAA", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" };
  if (ratio >= 4.5) return { label: "AA", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" };
  return { label: "Baixo contraste", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
}

const getBannerStatus = (banner: Banner): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } => {
  if (!banner.is_active) return { label: "Inativo", variant: "secondary" };
  const now = new Date();
  if (banner.starts_at && new Date(banner.starts_at) > now) return { label: "Agendado", variant: "outline" };
  if (banner.expires_at && new Date(banner.expires_at) <= now) return { label: "Expirado", variant: "destructive" };
  return { label: "Ativo", variant: "default" };
};

// Reverse map variant -> banner_type
const VARIANT_TO_TYPE: Record<BannerVariant, BannerType> = {
  warning: "warning",
  urgent: "warning",
  success: "success",
  neutral: "info",
  premium: "promo",
  ocean: "info",
  sunset: "promo",
  midnight: "info",
  neon: "update",
  custom: "info",
};

const AdminBanners = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { tenantId } = useAuthContext();
  const [metricsDialog, setMetricsDialog] = useState(false);
  const [metricsBanner, setMetricsBanner] = useState<Banner | null>(null);
  const [metricsAssignments, setMetricsAssignments] = useState<Assignment[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerDialog, setBannerDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, { total: number; views: number; upVotes: number; downVotes: number }>>({});
  const [fieldRules, setFieldRules] = useState<FieldRule[]>([]);
  const [conflictDialog, setConflictDialog] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [savingWithConflict, setSavingWithConflict] = useState(false);

  const defaultForm = {
    title: "",
    content: "",
    content_html: "",
    text_align: "center" as "left" | "center" | "right",
    bg_color: "#3B82F6",
    text_color: "#FFFFFF",
    link_url: "",
    link_label: "",
    has_voting: false,
    is_active: true,
    banner_type: "info" as BannerType,
    starts_at: null as Date | null,
    expires_at: null as Date | null,
    priority: 5,
    target_all: false,
    auto_assign_by_rules: false,
    max_views: null as number | null,
    position: "top",
    auto_dismiss_seconds: null as number | null,
    display_frequency: "always",
    border_style: "none",
    shadow_style: "soft",
    variant: "neutral" as BannerVariant,
    is_floating: false,
    can_close: true,
    has_decorations: false,
    outbound_type: "banner" as OutboundType,
    page_html: "",
  };

  const [form, setForm] = useState(defaultForm);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignStatusFilter, setAssignStatusFilter] = useState<"all" | "active" | "dismissed">("all");
  const [assignVoteFilter, setAssignVoteFilter] = useState<"all" | "up" | "down" | "none">("all");
  const [assignSortDesc, setAssignSortDesc] = useState(true);

  const fetchBanners = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("chat_banners")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("priority", { ascending: false });
    setBanners((data as any) ?? []);

    if (data && data.length > 0) {
      const { data: allAssignments } = await supabase
        .from("chat_banner_assignments")
        .select("banner_id, views_count, vote")
        .eq("tenant_id", tenantId);

      const counts: Record<string, { total: number; views: number; upVotes: number; downVotes: number }> = {};
      (allAssignments ?? []).forEach((a: any) => {
        if (!counts[a.banner_id]) counts[a.banner_id] = { total: 0, views: 0, upVotes: 0, downVotes: 0 };
        counts[a.banner_id].total++;
        counts[a.banner_id].views += a.views_count ?? 0;
        if (a.vote === "up") counts[a.banner_id].upVotes++;
        if (a.vote === "down") counts[a.banner_id].downVotes++;
      });
      setAssignmentCounts(counts);
    }

    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const fetchFieldRules = useCallback(async (bannerId: string) => {
    const { data } = await supabase
      .from("chat_banner_field_rules" as any)
      .select("id, banner_id, field_key, field_value, field_source, operator")
      .eq("banner_id", bannerId);
    setFieldRules(((data as unknown) as FieldRule[]) ?? []);
  }, []);

  const resolveVariantFromColors = (bgColor: string, textColor: string): BannerVariant => {
    for (const [key, style] of Object.entries(VARIANT_STYLES)) {
      const s = style.inlineStyle;
      const sBg = (s.background as string) ?? (s.backgroundColor as string) ?? "";
      if (sBg === bgColor && (s.color as string) === textColor) {
        return key as BannerVariant;
      }
    }
    return "custom";
  };

  const openBannerDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      const resolvedVariant = resolveVariantFromColors(banner.bg_color, banner.text_color);
      setForm({
        title: banner.title,
        content: banner.content,
        content_html: banner.content_html ?? "",
        text_align: (banner.text_align as "left" | "center" | "right") || "center",
        bg_color: banner.bg_color,
        text_color: banner.text_color,
        link_url: banner.link_url ?? "",
        link_label: banner.link_label ?? "",
        has_voting: banner.has_voting,
        is_active: banner.is_active,
        banner_type: (banner.banner_type as BannerType) || "info",
        starts_at: banner.starts_at ? new Date(banner.starts_at) : null,
        expires_at: banner.expires_at ? new Date(banner.expires_at) : null,
        priority: banner.priority ?? 5,
        target_all: banner.target_all ?? false,
        auto_assign_by_rules: (banner as any).auto_assign_by_rules ?? false,
        max_views: banner.max_views ?? null,
        position: banner.position ?? "top",
        auto_dismiss_seconds: banner.auto_dismiss_seconds ?? null,
        display_frequency: banner.display_frequency ?? "always",
        border_style: banner.border_style ?? "none",
        shadow_style: banner.shadow_style ?? "soft",
        variant: resolvedVariant,
        is_floating: banner.position === "float" || banner.border_style === "pill",
        can_close: true,
        has_decorations: (banner as any).has_decorations ?? false,
        outbound_type: ((banner as any).outbound_type as OutboundType) ?? "banner",
        page_html: (banner as any).page_html ?? "",
      });
      fetchFieldRules(banner.id);
    } else {
      setEditingBanner(null);
      setForm({ ...defaultForm });
      setFieldRules([]);
    }
    setBannerDialog(true);
  };

  const duplicateBanner = (banner: Banner) => {
    setEditingBanner(null);
    const resolvedVariant = resolveVariantFromColors(banner.bg_color, banner.text_color);
    setForm({
      title: banner.title + " (cópia)",
      content: banner.content,
      content_html: banner.content_html ?? "",
      text_align: (banner.text_align as "left" | "center" | "right") || "center",
      bg_color: banner.bg_color,
      text_color: banner.text_color,
      link_url: banner.link_url ?? "",
      link_label: banner.link_label ?? "",
      has_voting: banner.has_voting,
      is_active: false,
      banner_type: (banner.banner_type as BannerType) || "info",
      starts_at: null,
      expires_at: null,
      priority: banner.priority ?? 5,
      target_all: banner.target_all ?? false,
      auto_assign_by_rules: (banner as any).auto_assign_by_rules ?? false,
      max_views: banner.max_views ?? null,
      position: banner.position ?? "top",
      auto_dismiss_seconds: banner.auto_dismiss_seconds ?? null,
      display_frequency: banner.display_frequency ?? "always",
      border_style: banner.border_style ?? "none",
      shadow_style: banner.shadow_style ?? "soft",
      variant: resolvedVariant,
      is_floating: banner.position === "float" || banner.border_style === "pill",
      can_close: true,
      has_decorations: (banner as any).has_decorations ?? false,
      outbound_type: ((banner as any).outbound_type as OutboundType) ?? "banner",
      page_html: (banner as any).page_html ?? "",
    });
    setFieldRules([]);
    setBannerDialog(true);
  };

  // Check for period conflicts before saving
  const checkConflicts = async (): Promise<Conflict[]> => {
    const startsAt = form.starts_at?.toISOString() ?? null;
    const expiresAt = form.expires_at?.toISOString() ?? null;

    // Get all active banners except the current one being edited
    const { data: activeBanners } = await supabase
      .from("chat_banners")
      .select("id, title, starts_at, expires_at")
      .eq("is_active", true)
      .neq("id", editingBanner?.id ?? "00000000-0000-0000-0000-000000000000");

    if (!activeBanners || activeBanners.length === 0) return [];

    // Get target companies for this banner
    let targetContactIds: string[] = [];
    if (form.target_all) {
      const { data: allContacts } = await supabase
        .from("contacts")
        .select("id")
        .eq("is_company", true);
      targetContactIds = (allContacts ?? []).map((c: any) => c.id);
    } else if (editingBanner) {
      const { data: existing } = await supabase
        .from("chat_banner_assignments")
        .select("contact_id")
        .eq("banner_id", editingBanner.id);
      targetContactIds = (existing ?? []).map((a: any) => a.contact_id);
    }

    if (targetContactIds.length === 0) return [];

    const foundConflicts: Conflict[] = [];

    for (const other of activeBanners as any[]) {
      // Check period overlap
      const otherStart = other.starts_at ? new Date(other.starts_at) : new Date(0);
      const otherEnd = other.expires_at ? new Date(other.expires_at) : new Date("2099-12-31");
      const thisStart = startsAt ? new Date(startsAt) : new Date();
      const thisEnd = expiresAt ? new Date(expiresAt) : new Date("2099-12-31");

      if (thisStart <= otherEnd && thisEnd >= otherStart) {
        // Overlap detected - check if same companies
        const { data: otherAssignments } = await supabase
          .from("chat_banner_assignments")
          .select("contact_id")
          .eq("banner_id", other.id)
          .is("dismissed_at", null);

        const otherContactIds = new Set((otherAssignments ?? []).map((a: any) => a.contact_id));
        const overlapping = targetContactIds.filter(id => otherContactIds.has(id));

        if (overlapping.length > 0) {
          // Get company names for first 5
          const { data: companies } = await supabase
            .from("contacts")
            .select("id, name")
            .in("id", overlapping.slice(0, 5));

          for (const company of (companies ?? []) as any[]) {
            foundConflicts.push({
              companyId: company.id,
              companyName: company.name,
              existingBannerId: other.id,
              existingBannerTitle: other.title,
              overlapStart: (thisStart > otherStart ? thisStart : otherStart).toISOString(),
              overlapEnd: (thisEnd < otherEnd ? thisEnd : otherEnd).toISOString(),
            });
          }
        }
      }
    }

    return foundConflicts;
  };

  const saveBanner = async (skipConflictCheck = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Check conflicts if active and not skipping
    if (form.is_active && !skipConflictCheck) {
      const found = await checkConflicts();
      if (found.length > 0) {
        setConflicts(found);
        setConflictDialog(true);
        return;
      }
    }

    const derivedType = VARIANT_TO_TYPE[form.variant] ?? "info";
    const payload = {
      title: form.title,
      content: form.content,
      content_html: form.content_html || null,
      text_align: form.text_align,
      bg_color: form.bg_color,
      text_color: form.text_color,
      link_url: form.link_url || null,
      link_label: form.link_label || null,
      has_voting: form.has_voting,
      is_active: form.is_active,
      banner_type: derivedType,
      starts_at: form.starts_at?.toISOString() ?? null,
      expires_at: form.expires_at?.toISOString() ?? null,
      priority: form.priority,
      target_all: form.target_all,
      auto_assign_by_rules: form.auto_assign_by_rules,
      max_views: form.max_views,
      position: form.position,
      auto_dismiss_seconds: form.auto_dismiss_seconds,
      display_frequency: form.display_frequency,
      border_style: form.border_style,
      shadow_style: form.shadow_style,
      has_decorations: form.has_decorations,
      outbound_type: form.outbound_type,
      page_html: form.page_html || null,
    };

    if (editingBanner) {
      await supabase.from("chat_banners").update(payload as any).eq("id", editingBanner.id);
    } else {
      await supabase.from("chat_banners").insert({ ...payload, user_id: session.user.id, tenant_id: tenantId } as any);
    }

    setBannerDialog(false);
    setConflictDialog(false);
    toast({ title: t("common.save") });
    fetchBanners();
  };

  const handleConflictConfirm = async () => {
    setSavingWithConflict(true);
    await saveBanner(true);
    setSavingWithConflict(false);
  };

  const deleteBanner = async (id: string) => {
    await supabase.from("chat_banner_assignments").delete().eq("banner_id", id);
    await supabase.from("chat_banners").delete().eq("id", id);
    toast({ title: t("common.delete") });
    fetchBanners();
  };

  const openAssignDialog = async (banner: Banner) => {
    setSelectedBanner(banner);

    const contactQuery = supabase.from("contacts").select("id, name, email").eq("is_company", true).order("name");
    if (tenantId) contactQuery.eq("tenant_id", tenantId);

    const [{ data: assignData }, { data: contactsData }] = await Promise.all([
      supabase.from("chat_banner_assignments").select("*").eq("banner_id", banner.id),
      contactQuery,
    ]);

    const enriched = (assignData ?? []).map((a: any) => {
      const contact = (contactsData ?? []).find((c) => c.id === a.contact_id);
      return { ...a, contact_name: contact?.name ?? "—", contact_email: contact?.email ?? "—" };
    });

    setAssignments(enriched);
    setContacts((contactsData ?? []) as Contact[]);
    setSelectedContacts(new Set());
    setContactSearch("");
    setAssignDialog(true);
  };

  const assignContacts = async () => {
    if (!selectedBanner || selectedContacts.size === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const existingContactIds = new Set(assignments.map((a) => a.contact_id));
    const newContactIds = [...selectedContacts].filter((id) => !existingContactIds.has(id));

    if (newContactIds.length === 0) {
      toast({ title: "Todos os contatos selecionados já estão atribuídos" });
      return;
    }

    const { data: bannerData } = await supabase
      .from("chat_banners")
      .select("tenant_id")
      .eq("id", selectedBanner.id)
      .single();

    const rows = newContactIds.map((contact_id) => ({
      banner_id: selectedBanner.id,
      contact_id,
      tenant_id: (bannerData as any)?.tenant_id,
    }));

    await supabase.from("chat_banner_assignments").insert(rows as any);
    toast({ title: `${newContactIds.length} contatos atribuídos` });
    openAssignDialog(selectedBanner);
    fetchBanners();
  };

  const removeAssignment = async (id: string) => {
    await supabase.from("chat_banner_assignments").delete().eq("id", id);
    if (selectedBanner) openAssignDialog(selectedBanner);
    fetchBanners();
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(contactSearch.toLowerCase())
  );

  const openMetricsDialog = async (banner: Banner) => {
    setMetricsBanner(banner);
    const contactQuery = supabase.from("contacts").select("id, name, email").eq("is_company", true);
    if (tenantId) contactQuery.eq("tenant_id", tenantId);
    const [{ data: assignData }, { data: contactsData }] = await Promise.all([
      supabase.from("chat_banner_assignments").select("*").eq("banner_id", banner.id),
      contactQuery,
    ]);
    const enriched = (assignData ?? []).map((a: any) => {
      const contact = (contactsData ?? []).find((c: any) => c.id === a.contact_id);
      return { ...a, contact_name: contact?.name ?? "—", contact_email: contact?.email ?? "—" };
    });
    setMetricsAssignments(enriched);
    setMetricsDialog(true);
  };

  const getTypeConfig = (type: string) => BANNER_TYPES.find((t) => t.value === type) ?? BANNER_TYPES[0];
  const getVariantForBanner = (banner: Banner): BannerVariant => {
    return (TYPE_TO_VARIANT[banner.banner_type] ? Object.keys(VARIANT_TO_TYPE).find(k => VARIANT_TO_TYPE[k as BannerVariant] === banner.banner_type) as BannerVariant : "neutral") ?? "neutral";
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title={t("banners.title")} subtitle={t("banners.subtitle")}>
          <Button onClick={() => openBannerDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Outbound
          </Button>
        </PageHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : banners.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-lg">{t("banners.noBanners")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("banners.emptyDescription")}</p>
              </div>
              <Button onClick={() => openBannerDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t("banners.createFirst")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => {
              const counts = assignmentCounts[banner.id] ?? { total: 0, views: 0, upVotes: 0, downVotes: 0 };
              const status = getBannerStatus(banner);
              const totalVotes = counts.upVotes + counts.downVotes;
              const favorability = totalVotes > 0 ? Math.round((counts.upVotes / totalVotes) * 100) : null;
              const variantOpt = VARIANT_OPTIONS.find(v => v.value === (TYPE_TO_VARIANT[banner.banner_type] ?? "neutral")) ?? VARIANT_OPTIONS[3];

              return (
                <Card key={banner.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Variant color stripe */}
                      <div
                        className={cn("w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center", variantOpt.bgPreview)}
                        style={banner.bg_color.startsWith("linear-gradient") ? { background: banner.bg_color } : undefined}
                      >
                        <Palette className="h-5 w-5 text-white/80 drop-shadow-sm" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{banner.title}</h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {(banner as any).outbound_type === "page" ? (
                              <><FileText className="h-3 w-3 mr-1" />Página</>
                            ) : (
                              <><Megaphone className="h-3 w-3 mr-1" />Banner</>
                            )}
                          </Badge>
                          {banner.target_all && (
                            <Badge variant="outline" className="text-xs">{t("banners.allClients")}</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{variantOpt.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{banner.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {!banner.target_all && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {counts.total} {t("banners.clients")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {counts.views} views
                          </span>
                          {banner.has_voting && favorability !== null && (
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {favorability}% ({totalVotes})
                            </span>
                          )}
                          {banner.has_voting && favorability === null && (
                            <>
                              <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{counts.upVotes}</span>
                              <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3" />{counts.downVotes}</span>
                            </>
                          )}
                          {(banner.starts_at || banner.expires_at) && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {banner.starts_at ? format(new Date(banner.starts_at), "dd/MM") : "—"}
                              {" → "}
                              {banner.expires_at ? format(new Date(banner.expires_at), "dd/MM") : "∞"}
                            </span>
                          )}
                          <span className="text-muted-foreground/50">P{banner.priority}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMetricsDialog(banner)} title="Métricas">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        {!banner.target_all && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAssignDialog(banner)} title={t("banners.assignments")}>
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateBanner(banner)} title={t("banners.duplicate")}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBannerDialog(banner)} title={t("banners.edit")}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("banners.confirmDelete")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("banners.confirmDeleteDesc")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteBanner(banner.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {t("common.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Banner Create/Edit Dialog */}
      <Dialog open={bannerDialog} onOpenChange={setBannerDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{editingBanner ? t("banners.edit") : t("banners.create")}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {/* Form column — scrollable */}
            <div className="overflow-y-auto px-6 py-4 space-y-4 max-h-[50vh]">

              {/* Mobile preview collapsible */}
              {isMobile && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                    <div className="bg-white rounded-lg p-3">
                      <BannerPreview
                        content={form.content}
                        contentHtml={form.content_html || undefined}
                        textAlign={form.text_align}
                        bgColor={form.bg_color}
                        textColor={form.text_color}
                        linkUrl={form.link_url || undefined}
                        linkLabel={form.link_label || undefined}
                        hasVoting={form.has_voting}
                        bannerType={form.banner_type}
                        startsAt={form.starts_at?.toISOString()}
                        expiresAt={form.expires_at?.toISOString()}
                        position={form.position}
                        borderStyle={form.border_style}
                        shadowStyle={form.shadow_style}
                        variant={form.variant}
                        isFloating={form.is_floating}
                        canClose={form.can_close}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Section 1: Type + Title */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionIdentification")}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("banners.outboundType")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, outbound_type: "banner" })}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                        form.outbound_type === "banner"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Megaphone className="h-4 w-4" />
                      {t("banners.typeBanner")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, outbound_type: "page" })}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                        form.outbound_type === "page"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <FileText className="h-4 w-4" />
                      {t("banners.typePage")}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("banners.titleLabel")} <span className="text-destructive">*</span></Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título interno" />
                </div>
              </div>

              {/* Page type: Image upload + link */}
              {form.outbound_type === "page" && (
                <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                  <ImageUploadField
                    value={form.page_html}
                    onChange={(url) => setForm({ ...form, page_html: url, content: form.title })}
                    label="Imagem da página"
                    bucket="help-images"
                    folder="outbound-pages"
                    dimensions="Recomendado: 600×800px"
                    maxSizeMB={2}
                    accept=".png,.jpg,.jpeg,.gif,.webp"
                    hint="Esta imagem será exibida centralizada na tela do visitante"
                    previewHeight="h-40"
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Link de redirecionamento (opcional)</Label>
                    <Input
                      value={form.link_url || ""}
                      onChange={e => setForm({ ...form, link_url: e.target.value })}
                      placeholder="https://exemplo.com/oferta"
                    />
                    <p className="text-[10px] text-muted-foreground">Ao clicar na imagem, o visitante será redirecionado para este link</p>
                  </div>

                  {/* Preview do modal Page */}
                  {form.page_html && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Preview do modal</Label>
                      <div className="relative bg-black/60 rounded-lg p-6 flex items-center justify-center min-h-[200px]">
                        <img src={form.page_html} alt="Preview" className="max-h-48 rounded-xl shadow-lg object-contain" />
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white text-xs cursor-default">✕</div>
                        <p className="absolute bottom-1 text-[9px] text-white/60">Preview do modal</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Banner type: Content section */}
              {form.outbound_type === "banner" && (
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionContent")}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("banners.contentLabel")} <span className="text-destructive">*</span></Label>
                  <BannerRichEditor
                    initialHtml={form.content_html || undefined}
                    textAlign={form.text_align}
                    onChangeAlign={(align) => setForm({ ...form, text_align: align })}
                    onChange={(html, text) => setForm({ ...form, content_html: html, content: text })}
                    placeholder="Texto visível no widget (emojis OK)"
                  />
                </div>
              </div>
              )}

              {form.outbound_type === "banner" && (<>
              {/* Section 3: Appearance — Variant Selector */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionAppearance")}
                </div>

                <ScrollArea className="max-h-[280px] pr-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Estilo visual</Label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {VARIANT_OPTIONS.map((v) => {
                      const isSelected = form.variant === v.value;
                      return (
                        <button
                          key={v.value}
                          type="button"
                          onClick={() => {
                            if (v.value !== "custom") {
                              const vs = VARIANT_STYLES[v.value];
                              const bg = (vs.inlineStyle.background as string) ?? (vs.inlineStyle.backgroundColor as string) ?? form.bg_color;
                              const tc = (vs.inlineStyle.color as string) ?? form.text_color;
                              setForm({ ...form, variant: v.value, bg_color: bg, text_color: tc, has_decorations: vs.decorations });
                            } else {
                              setForm({ ...form, variant: v.value, has_decorations: false });
                            }
                          }}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2 rounded-lg border text-center transition-all",
                            isSelected
                              ? cn(v.borderClass, "ring-1 ring-offset-1 ring-offset-background shadow-sm bg-muted/50")
                              : "border-border hover:bg-muted/50"
                          )}
                        >
                          <div className={cn("w-6 h-3 rounded-full", v.bgPreview)} />
                          <span className="text-[10px] font-semibold leading-tight">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.variant === "custom" && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t("banners.bgColor")}</Label>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-md border border-border flex-shrink-0" style={bgStyle(form.bg_color)} />
                        <Input value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="flex-1 h-8 text-xs font-mono" />
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {BG_COLOR_PRESETS.map((color) => (
                          <button key={color} type="button" className={cn("w-full aspect-square rounded-md border-2 transition-transform hover:scale-110", !isGradient(form.bg_color) && form.bg_color.toLowerCase() === color.toLowerCase() ? "border-foreground ring-1 ring-foreground scale-110" : "border-transparent")} style={{ backgroundColor: color }} onClick={() => setForm({ ...form, bg_color: color })} />
                        ))}
                      </div>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1">
                            <ChevronDown className="h-3 w-3" /> Gradientes
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-1">
                          <div className="grid grid-cols-4 gap-1.5">
                            {GRADIENT_PRESETS.filter(g => g.group === "duo").map((g) => (
                              <button key={g.name} type="button" title={g.name} className={cn("w-full rounded-md border-2 transition-transform hover:scale-105", form.bg_color === g.value ? "border-foreground ring-1 ring-foreground scale-105" : "border-transparent")} style={{ background: g.value, aspectRatio: "3/1" }} onClick={() => setForm({ ...form, bg_color: g.value })} />
                            ))}
                          </div>
                          <Label className="text-xs text-muted-foreground mt-1">Monocromáticos</Label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {GRADIENT_PRESETS.filter(g => g.group === "mono").map((g) => (
                              <button key={g.name} type="button" title={g.name} className={cn("w-full rounded-md border-2 transition-transform hover:scale-105", form.bg_color === g.value ? "border-foreground ring-1 ring-foreground scale-105" : "border-transparent")} style={{ background: g.value, aspectRatio: "3/1" }} onClick={() => setForm({ ...form, bg_color: g.value })} />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t("banners.textColor")}</Label>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-md border border-border flex-shrink-0" style={{ backgroundColor: form.text_color }} />
                        <Input value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="flex-1 h-8 text-xs font-mono" />
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {TEXT_COLOR_PRESETS.map((color) => (
                          <button key={color} type="button" className={cn("w-full aspect-square rounded-md border-2 transition-transform hover:scale-110", form.text_color.toLowerCase() === color.toLowerCase() ? "border-foreground ring-1 ring-foreground scale-110" : "border-transparent")} style={{ backgroundColor: color }} onClick={() => setForm({ ...form, text_color: color })} />
                        ))}
                      </div>
                    </div>
                    {!isGradient(form.bg_color) && (() => {
                      const badge = getContrastBadge(form.bg_color, form.text_color);
                      return (
                        <div className="col-span-2 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Contraste WCAG:</span>
                          <Badge className={cn("text-xs", badge.className)}>{badge.label}</Badge>
                          <span className="text-xs text-muted-foreground">({getContrastRatio(form.bg_color, form.text_color).toFixed(1)}:1)</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                </ScrollArea>

                <div className="space-y-3 pt-2 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-3">
                      <Switch checked={form.is_floating} onCheckedChange={(v) => setForm({ ...form, is_floating: v, position: v ? "float" : "top", border_style: v ? "pill" : "none" })} />
                      <Label className="text-sm">Flutuante</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.can_close} onCheckedChange={(v) => setForm({ ...form, can_close: v })} />
                      <Label className="text-sm">Botão fechar</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.has_decorations} onCheckedChange={(v) => setForm({ ...form, has_decorations: v })} />
                      <Label className="text-sm">Formas decorativas</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Link + Voting */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionInteraction")}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("banners.linkUrl")}</Label>
                  <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("banners.linkLabel")}</Label>
                  <Input value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} placeholder="Saiba mais" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.has_voting} onCheckedChange={(v) => setForm({ ...form, has_voting: v })} />
                  <Label className="text-sm">{t("banners.enableVoting")}</Label>
                </div>
              </div>
              </>)}

              {/* Section 5: Scheduling */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarSectionIcon className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionSchedule")}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("banners.startsAt")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !form.starts_at && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {form.starts_at ? format(form.starts_at, "dd/MM/yyyy") : "Imediato"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.starts_at ?? undefined} onSelect={(d) => setForm({ ...form, starts_at: d ?? null })} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("banners.expiresAt")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !form.expires_at && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {form.expires_at ? format(form.expires_at, "dd/MM/yyyy") : "Sem limite"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.expires_at ?? undefined} onSelect={(d) => setForm({ ...form, expires_at: d ?? null })} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("banners.priority")}</Label>
                    <Select value={String(form.priority)} onValueChange={(v) => setForm({ ...form, priority: Number(v) })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} — {PRIORITY_LABELS[n]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("banners.maxViews")}</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-9"
                      value={form.max_views ?? ""}
                      onChange={(e) => setForm({ ...form, max_views: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> Auto-dismiss (seg)</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-9"
                      value={form.auto_dismiss_seconds ?? ""}
                      onChange={(e) => setForm({ ...form, auto_dismiss_seconds: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Desativado"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Repeat className="h-3 w-3" /> Frequência</Label>
                    <Select value={form.display_frequency} onValueChange={(v) => setForm({ ...form, display_frequency: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 6: Segmentation */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  {t("banners.sectionSegmentation")}
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox checked={form.target_all} onCheckedChange={(v) => setForm({ ...form, target_all: !!v, auto_assign_by_rules: false })} />
                  <Label className="text-sm">{t("banners.targetAll")}</Label>
                </div>
                {editingBanner && (
                  <BannerFieldRules
                    bannerId={editingBanner.id}
                    rules={fieldRules}
                    onChanged={() => fetchFieldRules(editingBanner.id)}
                  />
                )}
                {!editingBanner && (
                  <p className="text-xs text-muted-foreground">Salve o banner primeiro para configurar regras de segmentação automática.</p>
                )}
                {!form.target_all && (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={form.auto_assign_by_rules}
                      onCheckedChange={(v) => setForm({ ...form, auto_assign_by_rules: !!v })}
                    />
                    <div>
                      <Label className="text-sm">Incluir novas empresas automaticamente</Label>
                      <p className="text-xs text-muted-foreground">
                        Empresas que atenderem às regras de segmentação verão o banner automaticamente
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label className="text-sm">{t("banners.activeLabel")}</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Preview panel — collapsible sticky bottom (banner only) */}
          {!isMobile && form.outbound_type === "banner" && (
            <Collapsible defaultOpen className="border-t border-border bg-muted/20">
              <CollapsibleTrigger className="flex items-center gap-2 px-6 py-2 w-full text-left hover:bg-muted/40 transition-colors">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Preview</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform [[data-state=open]_&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-6 pb-3">
                <div className="bg-white rounded-lg p-3">
                  <BannerPreview
                    content={form.content}
                    contentHtml={form.content_html || undefined}
                    textAlign={form.text_align}
                    bgColor={form.bg_color}
                    textColor={form.text_color}
                    linkUrl={form.link_url || undefined}
                    linkLabel={form.link_label || undefined}
                    hasVoting={form.has_voting}
                    bannerType={VARIANT_TO_TYPE[form.variant] ?? "info"}
                    startsAt={form.starts_at?.toISOString()}
                    expiresAt={form.expires_at?.toISOString()}
                    position={form.position}
                    borderStyle={form.border_style}
                    shadowStyle={form.shadow_style}
                    variant={form.variant}
                    isFloating={form.is_floating}
                    canClose={form.can_close}
                    hasDecorations={form.has_decorations}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={() => setBannerDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => saveBanner()} disabled={!form.title || (form.outbound_type === "banner" ? !form.content : !form.page_html)}>
              {editingBanner ? "Salvar Alterações" : (form.outbound_type === "page" ? "Criar Página" : "Novo Outbound")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("banners.assignments")} — {selectedBanner?.title}</DialogTitle>
          </DialogHeader>

          {/* Summary metrics */}
          {(() => {
            const totalViews = assignments.reduce((s, a) => s + a.views_count, 0);
            const dismissed = assignments.filter(a => a.dismissed_at).length;
            const voted = assignments.filter(a => a.vote);
            const upVotes = voted.filter(a => a.vote === "up").length;
            const favorability = voted.length > 0 ? Math.round((upVotes / voted.length) * 100) : null;
            return (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Atribuídos", value: assignments.length },
                  { label: "Views", value: totalViews },
                  { label: "Favorabilidade", value: favorability !== null ? `${favorability}%` : "—" },
                  { label: "Dismissed", value: dismissed },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border bg-muted/20 p-3 text-center">
                    <p className="text-lg font-bold">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Add companies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("banners.addClients")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder={t("banners.searchClient")} className="pl-9" />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredContacts
                  .filter((c) => !assignments.some((a) => a.contact_id === c.id))
                  .map((c) => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer text-sm">
                      <Checkbox
                        checked={selectedContacts.has(c.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedContacts);
                          checked ? next.add(c.id) : next.delete(c.id);
                          setSelectedContacts(next);
                        }}
                      />
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground text-xs">{c.email}</span>
                    </label>
                  ))}
                {filteredContacts.filter((c) => !assignments.some((a) => a.contact_id === c.id)).length === 0 && (
                  <p className="text-center py-4 text-sm text-muted-foreground">{t("banners.noClients")}</p>
                )}
              </div>
              <Button size="sm" onClick={assignContacts} disabled={selectedContacts.size === 0}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar {selectedContacts.size} empresa{selectedContacts.size !== 1 ? "s" : ""}
              </Button>
            </CardContent>
          </Card>

          {/* Monitoring table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t("banners.currentAssignments")} ({assignments.length})</CardTitle>
                <button
                  type="button"
                  onClick={() => setAssignSortDesc(!assignSortDesc)}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Views {assignSortDesc ? "↓" : "↑"}
                </button>
              </div>
              {/* Inline filters */}
              <div className="flex items-center gap-2 pt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} placeholder="Buscar empresa..." className="h-8 text-xs pl-8" />
                </div>
                <Select value={assignStatusFilter} onValueChange={(v: any) => setAssignStatusFilter(v)}>
                  <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={assignVoteFilter} onValueChange={(v: any) => setAssignVoteFilter(v)}>
                  <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos votos</SelectItem>
                    <SelectItem value="up">Positivo</SelectItem>
                    <SelectItem value="down">Negativo</SelectItem>
                    <SelectItem value="none">Sem voto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("banners.noAssignments")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("banners.client")}</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Voto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments
                      .filter((a) => {
                        if (assignSearch && !(a.contact_name ?? "").toLowerCase().includes(assignSearch.toLowerCase())) return false;
                        if (assignStatusFilter === "active" && a.dismissed_at) return false;
                        if (assignStatusFilter === "dismissed" && !a.dismissed_at) return false;
                        if (assignVoteFilter === "up" && a.vote !== "up") return false;
                        if (assignVoteFilter === "down" && a.vote !== "down") return false;
                        if (assignVoteFilter === "none" && a.vote) return false;
                        return true;
                      })
                      .sort((a, b) => assignSortDesc ? b.views_count - a.views_count : a.views_count - b.views_count)
                      .map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{a.contact_name}</p>
                              <p className="text-xs text-muted-foreground">{a.contact_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <span className="text-sm">{a.views_count}</span>
                              {selectedBanner?.max_views && (
                                <Progress value={(a.views_count / selectedBanner.max_views) * 100} className="h-1.5 w-16" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {a.vote === "up" ? (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700 text-[10px]">
                                <ThumbsUp className="h-3 w-3 mr-1" /> Positivo
                              </Badge>
                            ) : a.vote === "down" ? (
                              <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">
                                <ThumbsDown className="h-3 w-3 mr-1" /> Negativo
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {a.dismissed_at ? (
                              <Badge variant="secondary" className="text-[10px]">Dismissed</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">Ativo</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAssignment(a.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
      {/* Conflict Dialog */}
      <BannerConflictDialog
        open={conflictDialog}
        onOpenChange={setConflictDialog}
        conflicts={conflicts}
        onConfirm={handleConflictConfirm}
        onCancel={() => setConflictDialog(false)}
        isLoading={savingWithConflict}
      />

      {/* Metrics Dialog */}
      <Dialog open={metricsDialog} onOpenChange={setMetricsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Métricas — {metricsBanner?.title}</DialogTitle>
          </DialogHeader>

          {(() => {
            const totalViews = metricsAssignments.reduce((s, a) => s + a.views_count, 0);
            const dismissed = metricsAssignments.filter(a => a.dismissed_at).length;
            const voted = metricsAssignments.filter(a => a.vote);
            const upVotes = voted.filter(a => a.vote === "up").length;
            const favorability = voted.length > 0 ? Math.round((upVotes / voted.length) * 100) : null;
            return (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Atribuídos", value: metricsAssignments.length },
                  { label: "Views", value: totalViews },
                  { label: "Favorabilidade", value: favorability !== null ? `${favorability}%` : "—" },
                  { label: "Dismissed", value: dismissed },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border bg-muted/20 p-3 text-center">
                    <p className="text-lg font-bold">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {metricsAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atribuição encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Voto</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metricsAssignments
                  .sort((a, b) => b.views_count - a.views_count)
                  .map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{a.contact_name}</p>
                          <p className="text-xs text-muted-foreground">{a.contact_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-sm">{a.views_count}</span>
                          {metricsBanner?.max_views && (
                            <Progress value={(a.views_count / metricsBanner.max_views) * 100} className="h-1.5 w-16" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.vote === "up" ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700 text-[10px]">
                            <ThumbsUp className="h-3 w-3 mr-1" /> Positivo
                          </Badge>
                        ) : a.vote === "down" ? (
                          <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">
                            <ThumbsDown className="h-3 w-3 mr-1" /> Negativo
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {a.dismissed_at ? (
                          <Badge variant="secondary" className="text-[10px]">Dismissed</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">Ativo</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminBanners;
