import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageSquare, Star, Clock } from "lucide-react";

interface TenantBenchmark {
  id: string;
  name: string;
  totalRooms: number;
  activeRooms: number;
  avgCsat: number;
  totalResponses: number;
  avgNps: number;
  totalContacts: number;
}

export default function BenchmarkTab() {
  const { data: benchmarks = [], isLoading } = useQuery({
    queryKey: ["bo-benchmark"],
    queryFn: async () => {
      const { data: tenants } = await supabase.from("tenants").select("id, name").eq("is_active", true).order("name");
      if (!tenants) return [];

      const results: TenantBenchmark[] = await Promise.all(
        tenants.map(async (t) => {
          const [rooms, active, csat, responses, nps, contacts] = await Promise.all([
            supabase.from("chat_rooms").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
            supabase.from("chat_rooms").select("id", { count: "exact", head: true }).eq("tenant_id", t.id).in("status", ["active", "waiting"]),
            supabase.from("chat_rooms").select("csat_score").eq("tenant_id", t.id).not("csat_score", "is", null).limit(500),
            supabase.from("responses").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
            supabase.from("responses").select("score").eq("tenant_id", t.id).limit(500),
            supabase.from("contacts").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
          ]);

          const csatScores = (csat.data ?? []).map((r: any) => r.csat_score).filter(Boolean);
          const npsScores = (nps.data ?? []).map((r: any) => r.score).filter((s: any) => s !== null);
          const avgCsat = csatScores.length > 0 ? csatScores.reduce((a: number, b: number) => a + b, 0) / csatScores.length : 0;
          const avgNps = npsScores.length > 0 ? npsScores.reduce((a: number, b: number) => a + b, 0) / npsScores.length : 0;

          return {
            id: t.id,
            name: t.name,
            totalRooms: rooms.count ?? 0,
            activeRooms: active.count ?? 0,
            avgCsat: Math.round(avgCsat * 10) / 10,
            totalResponses: responses.count ?? 0,
            avgNps: Math.round(avgNps * 10) / 10,
            totalContacts: contacts.count ?? 0,
          };
        })
      );

      return results;
    },
    staleTime: 120000,
  });

  const getScoreBadge = (score: number, type: "csat" | "nps") => {
    if (score === 0) return <span className="text-muted-foreground">—</span>;
    if (type === "csat") {
      return <Badge variant={score >= 4 ? "default" : score >= 3 ? "secondary" : "destructive"}>{score.toFixed(1)}</Badge>;
    }
    return <Badge variant={score >= 9 ? "default" : score >= 7 ? "secondary" : "destructive"}>{score.toFixed(1)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="h-5 w-5" /> Comparativo entre Plataformas
      </h3>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plataforma</TableHead>
                  <TableHead className="text-center">Empresas</TableHead>
                  <TableHead className="text-center">Salas Chat (total)</TableHead>
                  <TableHead className="text-center">Chat Ativas</TableHead>
                  <TableHead className="text-center">CSAT Médio</TableHead>
                  <TableHead className="text-center">Respostas NPS</TableHead>
                  <TableHead className="text-center">NPS Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarks.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-center">{b.totalContacts.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-center">{b.totalRooms.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={b.activeRooms > 0 ? "default" : "secondary"}>{b.activeRooms}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{getScoreBadge(b.avgCsat, "csat")}</TableCell>
                    <TableCell className="text-center">{b.totalResponses.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-center">{getScoreBadge(b.avgNps, "nps")}</TableCell>
                  </TableRow>
                ))}
                {benchmarks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma plataforma ativa
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
