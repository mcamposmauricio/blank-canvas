import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, X, Loader2, Link as LinkIcon, ImageIcon } from "lucide-react";

interface ImageUploadFieldProps {
  value?: string | null;
  onChange: (url: string) => void;
  label: string;
  bucket?: string;
  folder?: string;
  dimensions?: string;
  maxSizeMB?: number;
  accept?: string;
  hint?: string;
  previewMode?: "contain" | "cover";
  previewHeight?: string;
}

const ACCEPT_MAP: Record<string, string[]> = {
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".svg": ["image/svg+xml"],
  ".ico": ["image/x-icon", "image/vnd.microsoft.icon"],
  ".gif": ["image/gif"],
};

function getAcceptMimes(accept: string): string[] {
  return accept.split(",").flatMap(ext => ACCEPT_MAP[ext.trim().toLowerCase()] ?? []);
}

function formatAccept(accept: string): string {
  return accept.split(",").map(e => e.trim().replace(".", "").toUpperCase()).join(", ");
}

export function ImageUploadField({
  value,
  onChange,
  label,
  bucket = "help-images",
  folder = "uploads",
  dimensions,
  maxSizeMB = 2,
  accept = ".png,.jpg,.webp,.svg",
  hint,
  previewMode = "contain",
  previewHeight = "h-20",
}: ImageUploadFieldProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  const mimeAccept = getAcceptMimes(accept).join(",");
  const maxBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    const mimes = getAcceptMimes(accept);
    if (mimes.length > 0 && !mimes.includes(file.type)) {
      return t("imageUpload.invalidType");
    }
    if (file.size > maxBytes) {
      return t("imageUpload.tooLarge").replace("{max}", String(maxSizeMB));
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({ title: error, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const rand = Math.random().toString(36).substring(2, 8);
      const path = `${folder}/${Date.now()}-${rand}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(`${urlData.publicUrl}?t=${Date.now()}`);
      toast({ title: t("imageUpload.success") });
    } catch (err: any) {
      toast({ title: t("imageUpload.error"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [bucket, folder, accept, maxBytes, onChange, toast, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      onChange(urlValue.trim());
      setUrlValue("");
      setShowUrlInput(false);
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  const maxLabel = maxSizeMB >= 1 ? `${maxSizeMB}MB` : `${Math.round(maxSizeMB * 1024)}KB`;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Requirements */}
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
        {dimensions && <span>{dimensions}</span>}
        {dimensions && <span>•</span>}
        <span>Max: {maxLabel}</span>
        <span>•</span>
        <span>{formatAccept(accept)}</span>
      </p>

      {/* Drop zone + preview */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-4 transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border",
          "hover:border-primary/50"
        )}
      >
        {/* Preview */}
        {value && (
          <div className={cn("mb-3 rounded-md overflow-hidden bg-muted flex items-center justify-center", previewHeight)}>
            <img
              src={value}
              alt=""
              className={cn("max-h-full", previewMode === "cover" ? "w-full object-cover" : "object-contain max-w-full")}
              onError={e => (e.currentTarget.style.display = "none")}
            />
          </div>
        )}

        {/* Upload area */}
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <>
              {!value && (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs">{t("imageUpload.dragHint")}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {value ? t("imageUpload.change") : t("imageUpload.upload")}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                >
                  <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                  URL
                </Button>

                {value && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    {t("imageUpload.remove")}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={mimeAccept}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* URL manual input */}
      {showUrlInput && (
        <div className="flex items-center gap-2">
          <Input
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            placeholder="https://..."
            className="flex-1"
            onKeyDown={e => e.key === "Enter" && handleUrlSubmit()}
          />
          <Button type="button" size="sm" onClick={handleUrlSubmit}>OK</Button>
        </div>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
