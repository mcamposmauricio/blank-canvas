import { useState } from "react";
import { FileText, Download, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface FileMessageProps {
  metadata: {
    file_url: string;
    file_name: string;
    file_type: string;
    file_size?: number;
  };
  isOwn: boolean;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(type: string) {
  return type.startsWith("image/");
}

export function FileMessage({ metadata, isOwn }: FileMessageProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (isImage(metadata.file_type)) {
    return (
      <>
        <div className="space-y-1 cursor-pointer" onClick={() => setLightboxOpen(true)}>
          <img
            src={metadata.file_url}
            alt={metadata.file_name}
            className="max-w-[240px] max-h-[200px] rounded-md object-cover"
            loading="lazy"
          />
          <p className="text-[10px] opacity-60 truncate max-w-[240px]">{metadata.file_name}</p>
        </div>
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl p-2">
            <img
              src={metadata.file_url}
              alt={metadata.file_name}
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <a
      href={metadata.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 ${
        isOwn ? "border-primary-foreground/20" : "border-border"
      }`}
    >
      <FileText className="h-8 w-8 shrink-0 opacity-60" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{metadata.file_name}</p>
        {metadata.file_size && (
          <p className="text-[10px] opacity-60">{formatFileSize(metadata.file_size)}</p>
        )}
      </div>
      <Download className="h-4 w-4 shrink-0 opacity-60" />
    </a>
  );
}
