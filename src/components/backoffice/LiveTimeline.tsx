import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Star, Send, UserCheck, XCircle, Clock, Megaphone } from "lucide-react";
import { format, subMinutes, subHours } from "date-fns";

interface TimelineEvent {
  id: string;
  type: "room_created" | "room_closed" | "nps_response" | "campaign_sent" | "user_login" | "broadcast";
  tenantName: string;
  tenantId: string;
  description: string;
  timestamp: Date;
  meta?: Record<string, any>;
}

const MAX_EVENTS = 200;

const eventConfig: Record<string, { icon: any; color: string; label: string }> = {
  room_created: { icon: MessageSquare, color: "text-blue-500", label: "Chat Criado" },
  room_closed: { icon: XCircle, color: "text-gray-500", label: "Chat Fechado" },
  nps_response: { icon: Star, color: "text-amber-500", label: "Resposta NPS" },
  campaign_sent: { icon: Send, color: "text-green-500", label: "Campanha" },
  user_login: { icon: UserCheck, color: "text-purple-500", label: "Login" },
  broadcast: { icon: Megaphone, color: "text-indigo-500", label: "Broadcast" },
};

export default function LiveTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filterTenant, setFilterTenant] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<"15m" | "1h" | "6h" | "24h">("1h");
  const lastPollRef = useRef<string>(new Date().toISOString());

  // Tenant list for filter
  const { data: tenants = [] } = useQuery({
    queryKey: ["bo-timeline-tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("id, name").order("name");
      return data ?? [];
    },
    staleTime: 300000,
  });

  // Build tenant map for quick lookup
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  const addEvents = useCallback((newEvents: TimelineEvent[]) => {
    setEvents((prev) => {
      const combined = [...newEvents, ...prev];
      const unique = Array.from(new Map(combined.map((e) => [e.id, e])).values());
      unique.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return unique.slice(0, MAX_EVENTS);
    });
  }, []);

  // Initial load of recent events
  const sinceDate = filterPeriod === "15m" ? subMinutes(new Date(), 15)
    : filterPeriod === "1h" ? subHours(new Date(), 1)
    : filterPeriod === "6h" ? subHours(new Date(), 6)
    : subHours(new Date(), 24);

  useQuery({
    queryKey: ["bo-timeline-init", filterPeriod],
    queryFn: async () => {
      const since = sinceDate.toISOString();
      const [rooms, responses, campaigns] = await Promise.all([
        supabase.from("chat_rooms")
          .select("id, status, created_at, closed_at, tenant_id")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("responses")
          .select("id, score, responded_at, contact_id, contacts(name, tenant_id)")
          .gte("responded_at", since)
          .order("responded_at", { ascending: false })
          .limit(30),
        supabase.from("campaigns")
          .select("id, name, sent_at, tenant_id")
          .eq("status", "sent")
          .gte("sent_at", since)
          .order("sent_at", { ascending: false })
          .limit(20),
      ]);

      const evts: TimelineEvent[] = [];

      (rooms.data ?? []).forEach((r) => {
        evts.push({
          id: `room-${r.id}`,
          type: "room_created",
          tenantName: tenantMap.get(r.tenant_id || "") || "—",
          tenantId: r.tenant_id || "",
          description: `Nova sala de chat`,
          timestamp: new Date(r.created_at!),
        });
        if (r.status === "closed" && r.closed_at) {
          evts.push({
            id: `room-close-${r.id}`,
            type: "room_closed",
            tenantName: tenantMap.get(r.tenant_id || "") || "—",
            tenantId: r.tenant_id || "",
            description: `Sala de chat fechada`,
            timestamp: new Date(r.closed_at),
          });
        }
      });

      (responses.data ?? []).forEach((r: any) => {
        evts.push({
          id: `nps-${r.id}`,
          type: "nps_response",
          tenantName: tenantMap.get(r.contacts?.tenant_id || "") || "—",
          tenantId: r.contacts?.tenant_id || "",
          description: `NPS score ${r.score} — ${r.contacts?.name || "Anônimo"}`,
          timestamp: new Date(r.responded_at),
        });
      });

      (campaigns.data ?? []).forEach((c: any) => {
        evts.push({
          id: `camp-${c.id}`,
          type: "campaign_sent",
          tenantName: tenantMap.get(c.tenant_id || "") || "—",
          tenantId: c.tenant_id || "",
          description: `Campanha "${c.name}" enviada`,
          timestamp: new Date(c.sent_at),
        });
      });

      addEvents(evts);
      lastPollRef.current = new Date().toISOString();
      return null;
    },
    staleTime: 0,
    enabled: tenants.length > 0,
  });

  // Realtime listener for chat_rooms
  useEffect(() => {
    const channel = supabase
      .channel("bo-timeline-rooms")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_rooms" }, (payload) => {
        const r = payload.new as any;
        addEvents([{
          id: `room-rt-${r.id}`,
          type: "room_created",
          tenantName: tenantMap.get(r.tenant_id || "") || "—",
          tenantId: r.tenant_id || "",
          description: `Nova sala de chat`,
          timestamp: new Date(r.created_at || Date.now()),
        }]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_rooms" }, (payload) => {
        const r = payload.new as any;
        if (r.status === "closed" && r.closed_at) {
          addEvents([{
            id: `room-close-rt-${r.id}`,
            type: "room_closed",
            tenantName: tenantMap.get(r.tenant_id || "") || "—",
            tenantId: r.tenant_id || "",
            description: `Sala de chat fechada`,
            timestamp: new Date(r.closed_at),
          }]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenants, addEvents]);

  // Polling for NPS responses (every 30s)
  useEffect(() => {
    if (tenants.length === 0) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("responses")
        .select("id, score, responded_at, contact_id, contacts(name, tenant_id)")
        .gte("responded_at", lastPollRef.current)
        .order("responded_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const evts: TimelineEvent[] = data.map((r: any) => ({
          id: `nps-poll-${r.id}`,
          type: "nps_response" as const,
          tenantName: tenantMap.get(r.contacts?.tenant_id || "") || "—",
          tenantId: r.contacts?.tenant_id || "",
          description: `NPS score ${r.score} — ${r.contacts?.name || "Anônimo"}`,
          timestamp: new Date(r.responded_at),
        }));
        addEvents(evts);
      }
      lastPollRef.current = new Date().toISOString();
    }, 30000);

    return () => clearInterval(interval);
  }, [tenants, addEvents]);

  // Filter events
  const filtered = events.filter((e) => {
    if (filterTenant !== "all" && e.tenantId !== filterTenant) return false;
    if (filterType !== "all" && e.type !== filterType) return false;
    if (e.timestamp < sinceDate) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterTenant} onValueChange={setFilterTenant}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos os tenants" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tenants</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(eventConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="15m">Últimos 15min</SelectItem>
            <SelectItem value="1h">Última 1h</SelectItem>
            <SelectItem value="6h">Últimas 6h</SelectItem>
            <SelectItem value="24h">Últimas 24h</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="ml-auto">{filtered.length} eventos</Badge>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Timeline em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento no período</p>
              )}
              {filtered.map((evt) => {
                const cfg = eventConfig[evt.type] || eventConfig.room_created;
                const Icon = cfg.icon;
                return (
                  <div key={evt.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className={`mt-0.5 ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] shrink-0">{cfg.label}</Badge>
                        <span className="text-xs text-muted-foreground truncate">{evt.tenantName}</span>
                      </div>
                      <p className="text-sm mt-0.5 truncate">{evt.description}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                      {format(evt.timestamp, "HH:mm:ss")}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
