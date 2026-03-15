import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Send, BarChart3, MessageSquare, Star } from "lucide-react";
import { format } from "date-fns";

export default function GlobalMetrics() {
  const { data: counts } = useQuery({
    queryKey: ["backoffice-global-counts"],
    queryFn: async () => {
      const [tenants, users, contacts, campaigns, responses, rooms] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("campaigns").select("id", { count: "exact", head: true }),
        supabase.from("responses").select("id", { count: "exact", head: true }),
        supabase.from("chat_rooms").select("id", { count: "exact", head: true }),
      ]);
      return {
        tenants: tenants.count ?? 0,
        users: users.count ?? 0,
        contacts: contacts.count ?? 0,
        campaigns: campaigns.count ?? 0,
        responses: responses.count ?? 0,
        rooms: rooms.count ?? 0,
      };
    },
  });

  const { data: recentResponses = [] } = useQuery({
    queryKey: ["backoffice-recent-responses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("responses")
        .select("id, score, comment, responded_at, contact_id, contacts(name, email)")
        .order("responded_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: activeRooms = [] } = useQuery({
    queryKey: ["backoffice-active-rooms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_rooms")
        .select("id, status, created_at, visitor_id, chat_visitors(name, email), tenant_id, tenants(name)")
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-green-500";
    if (score >= 7) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Global counts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Tenants" value={counts?.tenants ?? 0} icon={Building2} />
        <MetricCard title="Usuários" value={counts?.users ?? 0} icon={Users} />
        <MetricCard title="Empresas" value={counts?.contacts ?? 0} icon={Building2} />
        <MetricCard title="Campanhas" value={counts?.campaigns ?? 0} icon={Send} />
        <MetricCard title="Respostas NPS" value={counts?.responses ?? 0} icon={BarChart3} />
        <MetricCard title="Salas Chat" value={counts?.rooms ?? 0} icon={MessageSquare} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent NPS */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4" />Últimas Respostas NPS</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Score</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentResponses.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><span className={`font-bold text-lg ${getScoreColor(r.score)}`}>{r.score}</span></TableCell>
                    <TableCell className="text-sm">{r.contacts?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.comment || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.responded_at ? format(new Date(r.responded_at), "dd/MM HH:mm") : "—"}</TableCell>
                  </TableRow>
                ))}
                {recentResponses.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Sem respostas</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Active Chat Rooms */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" />Salas de Chat Ativas</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitante</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRooms.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.chat_visitors?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.tenants?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : "secondary"}>
                        {r.status === "active" ? "Ativo" : "Aguardando"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.created_at ? format(new Date(r.created_at), "dd/MM HH:mm") : "—"}</TableCell>
                  </TableRow>
                ))}
                {activeRooms.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Sem salas ativas</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
