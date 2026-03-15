import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Play, Loader2, Clock, CheckCircle, XCircle, Trash2, Search, AlertTriangle } from "lucide-react";

interface FunctionLog {
  name: string;
  status: "idle" | "running" | "success" | "error";
  result?: string;
  timestamp?: Date;
}

interface OrphanUser {
  id: string;
  email: string;
  created_at: string;
}

const EDGE_FUNCTIONS = [
  { name: "process-chat-auto-rules", label: "Processar regras automáticas do chat", description: "Executa regras de fechamento e notificação automática" },
  { name: "process-automatic-campaigns", label: "Processar campanhas automáticas", description: "Envia campanhas NPS agendadas" },
  { name: "check-nps-pending", label: "Verificar NPS pendentes", description: "Checa campanhas com envios pendentes" },
  { name: "send-nps-reminder", label: "Enviar lembretes NPS", description: "Reenvia lembretes para quem não respondeu" },
];

export default function Operations() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<FunctionLog[]>(
    EDGE_FUNCTIONS.map(f => ({ name: f.name, status: "idle" }))
  );

  // Orphan cleanup state
  const [orphans, setOrphans] = useState<OrphanUser[]>([]);
  const [orphanLoading, setOrphanLoading] = useState(false);
  const [orphanScanned, setOrphanScanned] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const invokeFunction = async (name: string) => {
    setLogs(prev => prev.map(l => l.name === name ? { ...l, status: "running", result: undefined } : l));

    try {
      const { data, error } = await supabase.functions.invoke(name);

      if (error) throw error;

      setLogs(prev => prev.map(l =>
        l.name === name
          ? { ...l, status: "success", result: JSON.stringify(data, null, 2), timestamp: new Date() }
          : l
      ));
      toast({ title: `${name} executada com sucesso` });
    } catch (err: any) {
      setLogs(prev => prev.map(l =>
        l.name === name
          ? { ...l, status: "error", result: err.message || "Erro desconhecido", timestamp: new Date() }
          : l
      ));
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const scanOrphans = async () => {
    setOrphanLoading(true);
    setCleanupResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("backoffice-admin", {
        body: { action: "cleanup-orphan-auth-users", dry_run: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOrphans(data.orphans || []);
      setOrphanScanned(true);
      toast({ title: `${data.orphan_count} usuário(s) órfão(s) encontrado(s)` });
    } catch (err: any) {
      toast({ title: "Erro ao verificar", description: err.message, variant: "destructive" });
    } finally {
      setOrphanLoading(false);
    }
  };

  const executeCleanup = async () => {
    setCleanupLoading(true);
    setShowCleanupDialog(false);
    try {
      const { data, error } = await supabase.functions.invoke("backoffice-admin", {
        body: { action: "cleanup-orphan-auth-users", dry_run: false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCleanupResult(`${data.deleted_count} usuário(s) removido(s)${data.errors?.length > 0 ? `. ${data.errors.length} erro(s).` : ""}`);
      setOrphans([]);
      setOrphanScanned(false);
      toast({ title: `Limpeza concluída: ${data.deleted_count} removido(s)` });
    } catch (err: any) {
      toast({ title: "Erro na limpeza", description: err.message, variant: "destructive" });
    } finally {
      setCleanupLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Edge Functions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Executar Edge Functions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {EDGE_FUNCTIONS.map((fn, i) => {
            const log = logs[i];
            return (
              <div key={fn.name} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <p className="font-medium text-sm">{fn.label}</p>
                      <p className="text-xs text-muted-foreground">{fn.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.timestamp && (
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    )}
                    <Badge variant={
                      log.status === "success" ? "default" :
                      log.status === "error" ? "destructive" :
                      "secondary"
                    } className="text-xs">
                      {log.status === "idle" ? "Pronto" :
                       log.status === "running" ? "Executando..." :
                       log.status === "success" ? "Sucesso" : "Erro"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => invokeFunction(fn.name)}
                      disabled={log.status === "running"}
                      className="gap-1"
                    >
                      <Play className="h-3 w-3" />Executar
                    </Button>
                  </div>
                </div>
                {log.result && (
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 whitespace-pre-wrap">
                    {log.result}
                  </pre>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Orphan Cleanup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Limpeza de Usuários Órfãos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Identifica e remove usuários no auth que não possuem perfil ou role no sistema.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={scanOrphans}
              disabled={orphanLoading || cleanupLoading}
              className="gap-2"
            >
              {orphanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Verificar órfãos
            </Button>

            {orphanScanned && orphans.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowCleanupDialog(true)}
                disabled={cleanupLoading}
                className="gap-2"
              >
                {cleanupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Limpar {orphans.length} órfão(s)
              </Button>
            )}
          </div>

          {cleanupResult && (
            <div className="border rounded-lg p-3 bg-muted">
              <p className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {cleanupResult}
              </p>
            </div>
          )}

          {orphanScanned && orphans.length === 0 && !cleanupResult && (
            <div className="border rounded-lg p-3 bg-muted">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Nenhum usuário órfão encontrado.
              </p>
            </div>
          )}

          {orphans.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 font-medium">Email</th>
                    <th className="text-left p-2 font-medium">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {orphans.map(o => (
                    <tr key={o.id} className="border-t">
                      <td className="p-2">{o.email || "—"}</td>
                      <td className="p-2 text-muted-foreground">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup confirmation dialog */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar limpeza
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá remover permanentemente <strong>{orphans.length}</strong> usuário(s) do auth que não possuem perfil no sistema.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar limpeza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
