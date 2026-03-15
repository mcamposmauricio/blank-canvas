import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EditorToolbar } from "./EditorToolbar";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Comece a escrever seu artigo..." }: RichTextEditorProps) {
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "png";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("help-images").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("help-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        HTMLAttributes: { class: "help-editor-image" },
        allowBase64: false,
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "help-editor-link" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: "help-editor-content prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-6 py-4",
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return true;

            uploadImage(file).then((url) => {
              if (url && editor) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            });
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        const imageFile = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!imageFile) return false;

        event.preventDefault();
        uploadImage(imageFile).then((url) => {
          if (url && editor) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        });
        return true;
      },
    },
  });

  // Update content when it changes externally (e.g. version restore)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <EditorToolbar editor={editor} onImageUpload={uploadImage} />
      <EditorContent editor={editor} />
    </div>
  );
}
