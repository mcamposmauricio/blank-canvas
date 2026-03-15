import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, AlertTriangle, Filter, X } from "lucide-react";
import { exportToCSV } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

interface Response {
  id: string;
  score: number;
  comment: string | null;
  responded_at: string;
  campaigns: {
    name: string;
  };
  contacts: {
    name: string;
    email: string;
    state: string | null;
    health_score: number | null;
    mrr: number | null;
  };
}

const Results = () => {
  const [responses, setResponses] = useState<Response[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [mrrFilter, setMrrFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchResponses();
  }, []);

  useEffect(() => {
    let filtered = responses;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.campaigns.name.toLowerCase().includes(term) ||
          r.contacts.name.toLowerCase().includes(term) ||
          r.contacts.email.toLowerCase().includes(term)
      );
    }

    if (scoreFilter) {
      if (scoreFilter === "promoter") filtered = filtered.filter((r) => r.score >= 9);
      else if (scoreFilter === "passive") filtered = filtered.filter((r) => r.score >= 7 && r.score <= 8);
      else if (scoreFilter === "detractor") filtered = filtered.filter((r) => r.score <= 6);
    }

    if (stateFilter) {
      filtered = filtered.filter((r) => r.contacts.state === stateFilter);
    }

    if (mrrFilter) {
      if (mrrFilter === "high") filtered = filtered.filter((r) => (r.contacts.mrr ?? 0) >= 5000);
      else if (mrrFilter === "medium") filtered = filtered.filter((r) => (r.contacts.mrr ?? 0) >= 1000 && (r.contacts.mrr ?? 0) < 5000);
      else if (mrrFilter === "low") filtered = filtered.filter((r) => (r.contacts.mrr ?? 0) < 1000);
    }

    if (healthFilter) {
      if (healthFilter === "healthy") filtered = filtered.filter((r) => (r.contacts.health_score ?? 50) >= 70);
      else if (healthFilter === "warning") filtered = filtered.filter((r) => (r.contacts.health_score ?? 50) >= 40 && (r.contacts.health_score ?? 50) < 70);
      else if (healthFilter === "critical") filtered = filtered.filter((r) => (r.contacts.health_score ?? 50) < 40);
    }

    setFilteredResponses(filtered);
  }, [searchTerm, responses, scoreFilter, stateFilter, mrrFilter, healthFilter]);

  const fetchResponses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("responses")
        .select(
          `
          id,
          score,
          comment,
          responded_at,
          campaigns!inner (
            name
          ),
          contacts (
            name,
            email,
            state,
            health_score,
            mrr
          )
        `
        )
        .order("responded_at", { ascending: false });

      if (error) throw error;
      setResponses((data as any) || []);
      setFilteredResponses((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-success/10 text-success border-success/20";
    if (score >= 7) return "bg-warning/10 text-warning border-warning/20";
    return "bg-destructive/10 text-destructive border-destructive/20";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "Promotor";
    if (score >= 7) return "Neutro";
    return "Detrator";
  };

  const handleExportCSV = () => {
    const csvData = filteredResponses.map((r) => ({
      "Nome do Contato": r.contacts.name,
      "Email": r.contacts.email,
      "Campanha": r.campaigns.name,
      "Nota": r.score,
      "Categoria": getScoreLabel(r.score),
      "Comentário": r.comment || "",
      "Data de Resposta": new Date(r.responded_at).toLocaleString("pt-BR"),
    }));
    exportToCSV(csvData, "resultados_nps");
    toast({
      title: "CSV exportado!",
      description: "Arquivo baixado com sucesso.",
    });
  };

  const availableStates = [...new Set(responses.map((r) => r.contacts.state).filter(Boolean))] as string[];
  const activeFilterCount = [scoreFilter, stateFilter, mrrFilter, healthFilter].filter(Boolean).length;

  return (
    <div className="space-y-6">
        <PageHeader title="Resultados" subtitle="Visualize todas as respostas de NPS">
          {filteredResponses.length > 0 && (
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        </PageHeader>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por campanha, contato ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setScoreFilter(""); setStateFilter(""); setMrrFilter(""); setHealthFilter(""); }}>
              <X className="h-4 w-4 mr-1" />
              {activeFilterCount} filtros
            </Button>
          )}
        </div>

        {/* Segmentation Filters */}
        <div className="flex items-center gap-2 flex-wrap bg-muted/30 rounded-xl px-4 py-3">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={scoreFilter} onValueChange={(v) => setScoreFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Classificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="promoter">Promotores</SelectItem>
              <SelectItem value="passive">Neutros</SelectItem>
              <SelectItem value="detractor">Detratores</SelectItem>
            </SelectContent>
          </Select>
          {availableStates.length > 0 && (
            <Select value={stateFilter} onValueChange={(v) => setStateFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estados</SelectItem>
                {availableStates.sort().map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={mrrFilter} onValueChange={(v) => setMrrFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Faixa MRR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos MRR</SelectItem>
              <SelectItem value="high">Alto (≥R$5k)</SelectItem>
              <SelectItem value="medium">Médio (R$1k-5k)</SelectItem>
              <SelectItem value="low">Baixo (&lt;R$1k)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={healthFilter} onValueChange={(v) => setHealthFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Health Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="healthy">Saudável (≥70)</SelectItem>
              <SelectItem value="warning">Atenção (40-69)</SelectItem>
              <SelectItem value="critical">Crítico (&lt;40)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredResponses.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm || activeFilterCount > 0 ? "Nenhum resultado encontrado." : "Nenhuma resposta ainda."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredResponses.map((response) => (
              <Card key={response.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{response.contacts.name}</h3>
                      <span className="text-sm text-muted-foreground">{response.contacts.email}</span>
                      {response.score <= 6 && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Detrator
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Campanha: {response.campaigns.name}</p>
                  </div>

                  <div className={`px-4 py-2 rounded-lg border ${getScoreColor(response.score)}`}>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{response.score}</div>
                      <div className="text-xs">{getScoreLabel(response.score)}</div>
                    </div>
                  </div>
                </div>

                {response.comment && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm italic">&ldquo;{response.comment}&rdquo;</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-4">
                  Respondido em {new Date(response.responded_at).toLocaleString("pt-BR")}
                </p>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
};

export default Results;
