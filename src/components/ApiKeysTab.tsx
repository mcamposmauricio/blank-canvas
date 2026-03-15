import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Key, Plus, Trash2, Copy, Check, Code2, Eye, EyeOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  encrypted_key: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const ApiKeysTab = () => {
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
  const [showIntegrationCode, setShowIntegrationCode] = useState(false);
  const [selectedKeyForCode, setSelectedKeyForCode] = useState<ApiKey | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, encrypted_key, is_active, last_used_at, created_at")
        .like("key_prefix", "nps_%")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      console.error("Error fetching API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: t("settings.apiKeys.nameRequired"),
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate a secure random key
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const rawKey = "nps_" + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Hash the key for storage
      const encoder = new TextEncoder();
      const data = encoder.encode(rawKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Store the key with full encrypted_key for frontend use
      const { error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user.id,
          name: newKeyName.trim(),
          key_hash: keyHash,
          key_prefix: rawKey.substring(0, 12),
          encrypted_key: rawKey,
        });

      if (error) throw error;

      // Show the key to the user (only once!)
      setNewlyCreatedKey(rawKey);
      setNewKeyName("");
      await fetchApiKeys();

      toast({
        title: t("settings.apiKeys.createSuccess"),
        description: t("settings.apiKeys.copyWarning"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: t("settings.apiKeys.deleteSuccess"),
      });

      await fetchApiKeys();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setKeyToDelete(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getIntegrationCode = (apiKey: ApiKey) => {
    const baseUrl = window.location.origin;
    const actualKey = apiKey.encrypted_key || 'YOUR_API_KEY';
    
    return {
      script: `<!-- NPS Widget - Auto-init -->
<script 
  src="${baseUrl}/nps-widget.js"
  data-api-key="${actualKey}"
  data-external-id="CUSTOMER_EXTERNAL_ID"
></script>`,
      programmatic: `<!-- NPS Widget - Programmatic -->
<script src="${baseUrl}/nps-widget.js"></script>
<script>
  // Call this when your user logs in
  NPSWidget.init({
    apiKey: "${actualKey}",
    externalId: loggedUser.id, // Your customer's ID
    position: "bottom-right", // or "bottom-left", "center-modal"
    onComplete: (data) => {
      console.log("NPS submitted:", data.score);
    }
  });
</script>`,
      iframe: `<!-- NPS Widget - iFrame -->
<iframe 
  src="${baseUrl}/embed?api_key=${actualKey}&external_id=CUSTOMER_EXTERNAL_ID"
  style="position:fixed;bottom:20px;right:20px;width:420px;height:400px;border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;"
></iframe>`,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          {t("settings.apiKeys.title")}
        </CardTitle>
        <CardDescription>
          {t("settings.apiKeys.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create new key button */}
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("settings.apiKeys.create")}
        </Button>

        {/* API Keys list */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">
              {t("common.loading")}...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t("settings.apiKeys.noKeys")}</p>
            </div>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="font-medium">{key.name}</div>
                  <div className="text-sm text-muted-foreground font-mono truncate">
                    {key.encrypted_key || `${key.key_prefix}...`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("settings.apiKeys.created")}: {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at && (
                      <> • {t("settings.apiKeys.lastUsed")}: {new Date(key.last_used_at).toLocaleDateString()}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {key.encrypted_key && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        copyToClipboard(key.encrypted_key!);
                        toast({
                          title: t("settings.apiKeys.keyCopied"),
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedKeyForCode(key);
                      setShowIntegrationCode(true);
                    }}
                  >
                    <Code2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setKeyToDelete(key.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Key Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("settings.apiKeys.createTitle")}</DialogTitle>
              <DialogDescription>
                {t("settings.apiKeys.createDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("settings.apiKeys.keyName")}</Label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t("settings.apiKeys.keyNamePlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={generateApiKey} disabled={creating}>
                {creating ? t("common.loading") : t("settings.apiKeys.generate")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Newly Created Key Dialog */}
        <Dialog open={!!newlyCreatedKey} onOpenChange={() => setNewlyCreatedKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("settings.apiKeys.keyCreated")}</DialogTitle>
              <DialogDescription className="text-warning">
                {t("settings.apiKeys.copyWarning")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="relative">
                <Input
                  value={newlyCreatedKey || ""}
                  readOnly
                  className="font-mono pr-10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => copyToClipboard(newlyCreatedKey || "")}
                >
                  {copiedKey ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setNewlyCreatedKey(null)}>
                {t("common.done")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Integration Code Dialog */}
        <Dialog open={showIntegrationCode} onOpenChange={setShowIntegrationCode}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("settings.apiKeys.integrationCode")}</DialogTitle>
              <DialogDescription>
                {t("settings.apiKeys.integrationDescription")}
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="script" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="script">Script</TabsTrigger>
                <TabsTrigger value="programmatic">Programático</TabsTrigger>
                <TabsTrigger value="iframe">iFrame</TabsTrigger>
              </TabsList>
              {selectedKeyForCode && (
                <>
                  <TabsContent value="script" className="space-y-4">
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{getIntegrationCode(selectedKeyForCode).script}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2"
                        onClick={() => copyToClipboard(getIntegrationCode(selectedKeyForCode).script)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="programmatic" className="space-y-4">
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{getIntegrationCode(selectedKeyForCode).programmatic}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2"
                        onClick={() => copyToClipboard(getIntegrationCode(selectedKeyForCode).programmatic)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="iframe" className="space-y-4">
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{getIntegrationCode(selectedKeyForCode).iframe}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2"
                        onClick={() => copyToClipboard(getIntegrationCode(selectedKeyForCode).iframe)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
            <DialogFooter>
              <Button onClick={() => setShowIntegrationCode(false)}>
                {t("common.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <p className="text-xs text-muted-foreground">
          💡 Veja a aba <strong>Widget</strong> para opções de integração completas com preview visual.
        </p>

        {/* Delete Confirmation */}
        <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.apiKeys.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("settings.apiKeys.deleteDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => keyToDelete && deleteApiKey(keyToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default ApiKeysTab;
