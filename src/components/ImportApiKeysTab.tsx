import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  encrypted_key: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const ImportApiKeysTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => { fetchApiKeys(); }, []);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, encrypted_key, is_active, last_used_at, created_at")
        .like("key_prefix", "import_%")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      console.error("Error fetching import API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({ title: t("settings.apiKeys.nameRequired"), variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const rawKey = "import_" + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
      const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id,
        name: newKeyName.trim(),
        key_hash: keyHash,
        key_prefix: rawKey.substring(0, 12),
        encrypted_key: rawKey,
      });
      if (error) throw error;

      setNewlyCreatedKey(rawKey);
      setNewKeyName("");
      setShowCreateDialog(false);
      await fetchApiKeys();
      toast({ title: t("settings.apiKeys.createSuccess"), description: t("settings.apiKeys.copyWarning") });
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
      toast({ title: t("settings.apiKeys.deleteSuccess") });
      await fetchApiKeys();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setKeyToDelete(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-700 [&>svg]:text-amber-500">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{t("externalApi.keyWarning")}</AlertDescription>
      </Alert>

      <Button onClick={() => setShowCreateDialog(true)} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        {t("externalApi.createKey")}
      </Button>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">{t("common.loading")}...</div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Key className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{t("externalApi.noKeys")}</p>
          </div>
        ) : (
          apiKeys.map((key) => (
            <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="font-medium text-sm">{key.name}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {key.encrypted_key || `${key.key_prefix}...`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("settings.apiKeys.created")}: {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at && (<> • {t("settings.apiKeys.lastUsed")}: {new Date(key.last_used_at).toLocaleDateString()}</>)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {key.encrypted_key && (
                  <Button variant="outline" size="sm" onClick={() => { copyToClipboard(key.encrypted_key!); toast({ title: t("settings.apiKeys.keyCopied") }); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setKeyToDelete(key.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("externalApi.createKeyTitle")}</DialogTitle>
            <DialogDescription>{t("externalApi.createKeyDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("settings.apiKeys.keyName")}</Label>
              <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder={t("externalApi.keyNamePlaceholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={generateApiKey} disabled={creating}>{creating ? t("common.loading") : t("settings.apiKeys.generate")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Newly Created Key Dialog */}
      <Dialog open={!!newlyCreatedKey} onOpenChange={() => setNewlyCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.apiKeys.keyCreated")}</DialogTitle>
            <DialogDescription className="text-amber-600">{t("settings.apiKeys.copyWarning")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Input value={newlyCreatedKey || ""} readOnly className="font-mono pr-10" />
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => copyToClipboard(newlyCreatedKey || "")}>
                {copiedKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewlyCreatedKey(null)}>{t("common.done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.apiKeys.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.apiKeys.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => keyToDelete && deleteApiKey(keyToDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ImportApiKeysTab;
