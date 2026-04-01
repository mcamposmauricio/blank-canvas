import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, Wifi, Shield, HardDrive, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type HealthStatus = "ok" | "warn" | "error" | "checking";

interface HealthCheck {
  name: string;
  status: HealthStatus;
  latency?: number;
  detail?: string;
  icon: any;
}

export default function HealthCheckTab() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [running, setRunning] = useState(false);

  const runChecks = async () => {
    setRunning(true);
    const results: HealthCheck[] = [];

    // 1. Database ping
    const dbStart = performance.now();
    try {
      const { error } = await supabase.from("tenants").select("id").limit(1);
      const latency = Math.round(performance.now() - dbStart);
      results.push({
        name: "Database (PostgreSQL)",
        status: error ? "error" : latency > 2000 ? "warn" : "ok",
        latency,
        detail: error ? error.message : `${latency}ms`,
        icon: Database,
      });
    } catch (e: any) {
      results.push({ name: "Database (PostgreSQL)", status: "error", detail: e.message, icon: Database });
    }

    // 2. Auth service
    const authStart = performance.now();
    try {
      const { data } = await supabase.auth.getSession();
      const latency = Math.round(performance.now() - authStart);
      results.push({
        name: "Auth (GoTrue)",
        status: data.session ? "ok" : "warn",
        latency,
        detail: data.session ? `Sessão ativa — ${latency}ms` : "Sem sessão",
        icon: Shield,
      });
    } catch (e: any) {
      results.push({ name: "Auth (GoTrue)", status: "error", detail: e.message, icon: Shield });
    }

    // 3. Realtime check (create and immediately remove a channel)
    const rtStart = performance.now();
    try {
      const testChannel = supabase.channel("health-check-test");
      await new Promise<void>((resolve) => {
        testChannel.subscribe((status) => {
          if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR") resolve();
        });
        setTimeout(resolve, 5000);
      });
      const latency = Math.round(performance.now() - rtStart);
      supabase.removeChannel(testChannel);
      results.push({
        name: "Realtime (WebSocket)",
        status: latency > 3000 ? "warn" : "ok",
        latency,
        detail: `${latency}ms`,
        icon: Wifi,
      });
    } catch (e: any) {
      results.push({ name: "Realtime (WebSocket)", status: "error", detail: e.message, icon: Wifi });
    }

    // 4. Storage check
    const stgStart = performance.now();
    try {
      const { data, error } = await supabase.storage.listBuckets();
      const latency = Math.round(performance.now() - stgStart);
      results.push({
        name: "Storage",
        status: error ? "error" : "ok",
        latency,
        detail: error ? error.message : `${data?.length ?? 0} buckets — ${latency}ms`,
        icon: HardDrive,
      });
    } catch (e: any) {
      results.push({ name: "Storage", status: "error", detail: e.message, icon: HardDrive });
    }

    setChecks(results);
    setRunning(false);
  };

  // Auto-run on first render
  useQuery({
    queryKey: ["bo-health-auto"],
    queryFn: async () => { await runChecks(); return null; },
    staleTime: Infinity,
  });

  const statusIcon = (status: HealthStatus) => {
    if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status === "warn") return <CheckCircle2 className="h-5 w-5 text-amber-500" />;
    if (status === "error") return <XCircle className="h-5 w-5 text-red-500" />;
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  };

  const overallStatus = checks.length === 0 ? "checking" : checks.some(c => c.status === "error") ? "error" : checks.some(c => c.status === "warn") ? "warn" : "ok";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Status do Sistema</h3>
          {checks.length > 0 && (
            <Badge variant={overallStatus === "ok" ? "default" : overallStatus === "warn" ? "secondary" : "destructive"}>
              {overallStatus === "ok" ? "Todos os serviços operando" : overallStatus === "warn" ? "Degradação detectada" : "Falha detectada"}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={runChecks} disabled={running} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} /> Verificar Agora
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <Card key={check.name}>
              <CardContent className="flex items-center gap-4 p-4">
                {statusIcon(check.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{check.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{check.detail || "Verificando..."}</p>
                </div>
                {check.latency !== undefined && (
                  <Badge variant="outline" className="shrink-0">
                    {check.latency}ms
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
        {checks.length === 0 && !running && (
          <p className="col-span-2 text-sm text-muted-foreground text-center py-8">Clique em "Verificar Agora" para checar o status</p>
        )}
      </div>
    </div>
  );
}
