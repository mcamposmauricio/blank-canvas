// Shared chat utility functions used across Widget, Portal, and Workspace

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function isImage(type: string): boolean {
  return type.startsWith("image/");
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatChatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export interface FileMetadata {
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
}

import React from "react";
import { supabase } from "@/integrations/supabase/client";

// Render a text segment with bold markdown (*text* → <strong>)
function renderWithBold(text: string, keyPrefix: string): React.ReactNode {
  const boldRegex = /\*([^*]+)\*/g;
  const parts = text.split(boldRegex);
  if (parts.length === 1) return text;
  return React.createElement(React.Fragment, null,
    ...parts.map((part, i) =>
      i % 2 === 1
        ? React.createElement("strong", { key: `${keyPrefix}-b-${i}` }, part)
        : part
    )
  );
}

// Detect URLs and render them as clickable links, plus *bold* formatting
export function renderTextWithLinks(text: string, isOwn: boolean): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return renderWithBold(text, "t");

  return React.createElement(React.Fragment, null,
    ...parts.map((part, i) => {
      if (/(https?:\/\/[^\s<]+)/.test(part)) {
        return React.createElement("a", {
          key: i,
          href: part,
          target: "_blank",
          rel: "noopener noreferrer",
          className: `underline break-all ${isOwn ? "text-primary-foreground/90 hover:text-primary-foreground" : "text-primary hover:text-primary/80"}`,
        }, part);
      }
      return React.createElement("span", { key: i }, renderWithBold(part, `s${i}`));
    })
  );
}

export async function uploadChatFile(
  file: File,
  bucket = "chat-attachments"
): Promise<FileMetadata | null> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type });

  if (error) return null;

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return {
    file_url: urlData.publicUrl,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
  };
}
