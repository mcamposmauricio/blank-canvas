import { ThumbsUp, ThumbsDown, ExternalLink, X, Info, AlertTriangle, CheckCircle, Megaphone, Sparkles, Hammer, ShieldAlert, Zap, Moon, Flame, Droplets } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BannerPreviewProps {
  content: string;
  contentHtml?: string;
  textAlign?: string;
  bgColor: string;
  textColor: string;
  linkUrl?: string;
  linkLabel?: string;
  hasVoting: boolean;
  bannerType?: string;
  startsAt?: string;
  expiresAt?: string;
  position?: string;
  borderStyle?: string;
  shadowStyle?: string;
  variant?: BannerVariant;
  isFloating?: boolean;
  canClose?: boolean;
  hasDecorations?: boolean;
}

export type BannerVariant = "warning" | "urgent" | "success" | "neutral" | "premium" | "ocean" | "sunset" | "midnight" | "neon" | "custom";

interface VariantStyle {
  inlineStyle: React.CSSProperties;
  icon: typeof Info;
  decorations: boolean;
}

const VARIANT_STYLES: Record<Exclude<BannerVariant, "custom">, VariantStyle> = {
  warning: {
    inlineStyle: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A", color: "#78350F" },
    icon: Hammer,
    decorations: false
  },
  urgent: {
    inlineStyle: { backgroundColor: "#DC2626", borderColor: "#B91C1C", color: "#FFFFFF" },
    icon: ShieldAlert,
    decorations: false
  },
  success: {
    inlineStyle: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0", color: "#064E3B" },
    icon: CheckCircle,
    decorations: false
  },
  neutral: {
    inlineStyle: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#0F172A" },
    icon: Info,
    decorations: false
  },
  premium: {
    inlineStyle: { backgroundColor: "#4F46E5", borderColor: "#4338CA", color: "#FFFFFF" },
    icon: Megaphone,
    decorations: true
  },
  ocean: {
    inlineStyle: { background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", borderColor: "transparent", color: "#FFFFFF" },
    icon: Droplets,
    decorations: true
  },
  sunset: {
    inlineStyle: { background: "linear-gradient(135deg, #F97316, #EF4444)", borderColor: "transparent", color: "#FFFFFF" },
    icon: Flame,
    decorations: true
  },
  midnight: {
    inlineStyle: { backgroundColor: "#0F172A", borderColor: "#334155", color: "#F1F5F9" },
    icon: Moon,
    decorations: true
  },
  neon: {
    inlineStyle: { background: "linear-gradient(135deg, #EC4899, #06B6D4)", borderColor: "transparent", color: "#FFFFFF" },
    icon: Zap,
    decorations: true
  }
};

const TYPE_TO_VARIANT: Record<string, BannerVariant> = {
  info: "neutral",
  warning: "warning",
  success: "success",
  promo: "premium",
  update: "premium"
};

const BannerPreview = ({
  content,
  contentHtml,
  textAlign = "center",
  bgColor,
  textColor,
  linkUrl,
  linkLabel,
  hasVoting,
  bannerType = "info",
  startsAt,
  expiresAt,
  position = "top",
  borderStyle = "none",
  shadowStyle = "none",
  variant,
  isFloating = false,
  canClose = true,
  hasDecorations = false
}: BannerPreviewProps) => {
  const resolvedVariant = variant ?? TYPE_TO_VARIANT[bannerType] ?? "neutral";
  const isCustom = resolvedVariant === "custom";
  const variantStyle = !isCustom ? VARIANT_STYLES[resolvedVariant] : null;
  const TypeIcon = variantStyle?.icon ?? Info;
  // Always use props as source of truth for colors (they come from form.bg_color/text_color)
  const bannerColor = textColor || (isCustom ? "#FFFFFF" : (variantStyle?.inlineStyle.color as string ?? "#0F172A"));

  const getScheduleBadge = () => {
    if (!startsAt && !expiresAt) return null;
    const now = new Date();
    if (startsAt && new Date(startsAt) > now) {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 opacity-70 bg-transparent" style={{ color: bannerColor, borderColor: bannerColor }}>
          Agendado
        </Badge>
      );
    }
    if (expiresAt) {
      const diff = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0 && diff <= 7) {
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 opacity-70 bg-transparent" style={{ color: bannerColor, borderColor: bannerColor }}>
            Expira em {diff}d
          </Badge>
        );
      }
    }
    return null;
  };

  const floatingMode = isFloating || borderStyle === "pill";

  // Always use bgColor/textColor props as the source of truth
  const bannerInlineStyle: React.CSSProperties = {
    ...(bgColor.startsWith("linear-gradient") ? { background: bgColor } : { backgroundColor: bgColor }),
    color: textColor || variantStyle?.inlineStyle.color as string || "#0F172A",
    borderColor: variantStyle?.inlineStyle.borderColor as string || "transparent"
  };

  return (
    <div className={cn("mx-auto overflow-hidden", floatingMode ? "w-fit max-w-[calc(80ch+5rem)]" : "w-full max-w-lg")}>
      {/* Banner */}
      <div
        className={cn(
          "py-2.5 px-5 text-sm leading-relaxed relative flex flex-col items-center justify-center gap-1.5",
          "font-medium tracking-[0.01em] backdrop-blur-md transition-all border",
          floatingMode && "mx-4 my-3 rounded-2xl shadow-lg",
          !floatingMode && "rounded-none shadow-sm",
          hasDecorations && "overflow-visible"
        )}
        style={bannerInlineStyle}
      >
        {/* Decorative geometric shapes */}
        {hasDecorations && (
          <>
            {/* Left circles */}
            <svg className="absolute -left-5 -top-4 pointer-events-none opacity-[0.12]" width="72" height="72" viewBox="0 0 72 72" fill="none">
              <circle cx="36" cy="36" r="36" fill={bannerColor} />
            </svg>
            <svg className="absolute left-3 -bottom-3 pointer-events-none opacity-[0.08]" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill={bannerColor} />
            </svg>
            {/* Right rectangles */}
            <svg className="absolute -right-3 -top-5 pointer-events-none opacity-[0.10]" width="20" height="52" viewBox="0 0 20 52" fill="none">
              <rect x="0" y="0" width="20" height="52" rx="6" fill={bannerColor} />
            </svg>
            <svg className="absolute right-5 -top-3 pointer-events-none opacity-[0.07]" width="14" height="36" viewBox="0 0 14 36" fill="none">
              <rect x="0" y="0" width="14" height="36" rx="4" fill={bannerColor} />
            </svg>
            {/* Small dot accent */}
            <svg className="absolute -left-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-[0.15]" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="8" fill={bannerColor} />
            </svg>
          </>
        )}
        {/* Close button */}
        {canClose && (
          <button
            className="absolute top-2.5 right-3 p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: bannerColor }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Main content */}
        <div className="flex items-center justify-center gap-3 w-full pr-8" style={{ textAlign: textAlign as any, color: bannerColor }}>
          <TypeIcon className="h-4 w-4 flex-shrink-0 opacity-80" />
          {contentHtml ? (
            <span
              dangerouslySetInnerHTML={{ __html: contentHtml }}
              className="flex-1 min-w-0 overflow-hidden line-clamp-2 [&_a]:break-all"
              style={{ lineHeight: "1.5", wordBreak: "break-word", overflowWrap: "break-word", maxWidth: "80ch" }}
            />
          ) : (
            <span className="flex-1 min-w-0 overflow-hidden line-clamp-2" style={{ maxWidth: "80ch" }}>{content || "Texto do banner aqui..."}</span>
          )}
          {getScheduleBadge()}
        </div>

        {/* Actions */}
        {(linkUrl || hasVoting) && (
          <div className="flex items-center justify-center gap-3">
            {linkUrl && (
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 opacity-90 hover:opacity-70 cursor-pointer transition-opacity"
                style={{ color: bannerColor }}
              >
                {linkLabel || "Saiba mais"}
                <ExternalLink className="h-3 w-3" />
              </span>
            )}
            {hasVoting && (
              <div className="flex items-center gap-1">
                <span className="p-1 rounded cursor-pointer hover:opacity-70" style={{ color: bannerColor }}>
                  <ThumbsUp className="h-3.5 w-3.5" />
                </span>
                <span className="p-1 rounded cursor-pointer hover:opacity-70" style={{ color: bannerColor }}>
                  <ThumbsDown className="h-3.5 w-3.5" />
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerPreview;
export { VARIANT_STYLES, TYPE_TO_VARIANT };
