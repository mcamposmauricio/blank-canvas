import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Database, Zap, Users, Activity, Clock, AlertTriangle } from "lucide-react";
import { format, subHours } from "date-fns";

export default function PerformanceTab() {
  const [period, setPeriod] = useState<"1h" | "6h" | "24h">("24h");
  const sinceDate = period === "1h" ? subHours(new Date(), 1) : period === "6h" ? subHours(new Date(), 6) : subHours(new Date(), 24);

  // Database volume: counts of recent inserts across key tables
  const { data: dbVolume, isLoading: volumeLoading, refetch: refetchVolume } = useQuery({
    queryKey: ["bo-perf-volume", period],
    queryFn: async () => {
      const since = sinceDate.toISOString();
      const [messages, rooms, responses, campaigns] = await Promise.all([
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("chat_rooms").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("responses").select("id", { count: "exact", head: true }).gte("responded_at", since),
        supabase.from("campaign_sends").select("id", { count: "exact", head: true }).gte("created_at", since),
      ]);
      return {
        messages: messages.count ?? 0,
        rooms: rooms.count ?? 0,
        responses: responses.count ?? 0,
        campaignSends: campaigns.count ?? 0,
      };
    },
    staleTime: 60000,
  });

  // Active realtime proxy: count active/waiting rooms as proxy for realtime pressure
  const { data: realtimeProxy, refetch: refetchRealtime } = useQuery({
    queryKey: ["bo-perf-realtime"],
    queryFn: async () => {
      const [active, visitors, attendants] = await Promise.all([
        supabase.from("chat_rooms").select("id", { count: "exact", head: true }).in("status", ["active", "waiting"]),
        supabase.from("chat_visitors").select("id", { count: "exact", head: true }).gte("created_at", subHours(new Date(), 1).toISOString()),
        supabase.from("attendant_profiles").select("id", { count: "exact", head: true }).eq("status", "online"),
      ]);
      return {
        activeRooms: active.count ?? 0,
        recentVisitors: visitors.count ?? 0,
        onlineAttendants: attendants.count ?? 0,
      };
    },
    staleTime: 30000,
  });

  // Table sizes: largest tables by row count
  const { data: tableSizes = [], refetch: refetchTables } = useQuery({
    queryKey: ["bo-perf-tables"],
    queryFn: async () => {
      const tables = [
        { name: "chat_messages", label: "Chat Messages" },
        { name: "chat_rooms", label: "Chat Rooms" },
        { name: "responses", label: "NPS Responses" },
        { name: "contacts", label: "Empresas" },
        { name: "company_contacts", label: "Contatos" },
        { name: "campaign_contacts", label: "Campaign Contacts" },
        { name: "campaign_sends", label: "Campaign Sends" },
        { name: "chat_visitors", label: "Chat Visitors" },
        { name: "chat_banner_assignments", label: "Banner Assignments" },
        { name: "chat_room_reads", label: "Room Reads" },
      ];
      const results = await Promise.all(
        tables.map(async (t) => {
          const { count } = await supabase.from(t.name as any).select("id", { count: "exact", head: true });
          return { ...t, count: count ?? 0 };
        })
      );
      return results.sort((a, b) => b.count - a.count);
    },
    staleTime: 120000,
  });

  // Recent errors: rooms with issues (e.g. unassigned for too long)
  const { data: staleRooms = [] } = useQuery({
    queryKey: ["bo-perf-stale-rooms"],
    queryFn: async () => {
      const thirtyMinAgo = subHours(new Date(), 0.5).toISOString();
      const { data } = await supabase
        .from("chat_rooms")
        .select("id, status, created_at, tenant_id, tenants(name)")
        .eq("status", "waiting")
        .lt("created_at", thirtyMinAgo)
        .order("created_at", { ascending: true })
        .limit(10);
      return data ?? [];
    },
    staleTime: 60000,
  });

  const handleRefreshAll = () => {
    refetchVolume();
    refetchRealtime();
    refetchTables();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última 1h</SelectItem>
              <SelectItem value="6h">Últimas 6h</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefreshAll} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Volume metrics */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Volume no Período</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Mensagens Chat" value={dbVolume?.messages ?? 0} icon={Database} loading={volumeLoading} />
          <MetricCard title="Salas Criadas" value={dbVolume?.rooms ?? 0} icon={Activity} loading={volumeLoading} />
          <MetricCard title="Respostas NPS" value={dbVolume?.responses ?? 0} icon={Zap} loading={volumeLoading} />
          <MetricCard title="Envios Campanha" value={dbVolume?.campaignSends ?? 0} icon={Zap} loading={volumeLoading} />
        </div>
      </div>

      {/* Realtime proxy */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Realtime & Conexões</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard title="Salas Ativas/Esperando" value={realtimeProxy?.activeRooms ?? 0} icon={Activity} />
          <MetricCard title="Visitantes (última 1h)" value={realtimeProxy?.recentVisitors ?? 0} icon={Users} />
          <MetricCard title="Atendentes Online" value={realtimeProxy?.onlineAttendants ?? 0} icon={Users} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table sizes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> Volume por Tabela
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tabela</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableSizes.map((t) => (
                  <TableRow key={t.name}>
                    <TableCell className="font-mono text-sm">{t.label}</TableCell>
                    <TableCell className="text-right font-mono">
                      {t.count.toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stale rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Salas Esperando {">"}30min
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staleRooms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma sala com espera longa</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Esperando desde</TableHead>
                    <TableHead>Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staleRooms.map((r: any) => {
                    const waitMinutes = Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.tenants?.name ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd/MM HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={waitMinutes > 60 ? "destructive" : "secondary"}>
                            {waitMinutes}min
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
