import { useState, useEffect } from "react";
import { Star, ThumbsUp, ThumbsDown, BarChart3, Download, MessageSquare, ChevronLeft, ChevronRight, X, MessageCircle, CheckCircle, Percent, Trophy, Medal, Clock, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MetricCard } from "@/components/ui/metric-card";
import { ReadOnlyChatDialog } from "@/components/chat/ReadOnlyChatDialog";
import { PageHeader } from "@/components/ui/page-header";
import { SectionLabel } from "@/components/ui/section-label";
import { FilterBar } from "@/components/ui/filter-bar";
import { ChartCard } from "@/components/ui/chart-card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCSATReport, type CSATReportFilters } from "@/hooks/useCSATReport";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

const AdminCSATReport = () => {
  const { t } = useLanguage();
  const { isAdmin, isMaster } = useAuth();

  const [filters, setFilters] = useState<CSATReportFilters>({
    period: "month", scores: [], attendantIds: [], teamIds: [], tagIds: [],
    contactId: null, companyContactId: null,
    dateFrom: fmt(subDays(new Date(), 29)), dateTo: fmt(new Date()),
    sortBy: "date", sortDir: "desc", page: 0,
  });

  const { records, stats, totalCount, loading, pageSize, refetch } = useCSATReport(filters);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [attendantOptions, setAttendantOptions] = useState<{ id: string; name: string }[]>([]);
  const [teamOptions, setTeamOptions] = useState<{ id: string; name: string }[]>([]);
  const [tagOptions, setTagOptions] = useState<{ id: string; name: string }[]>([]);
  const [companyOptions, setCompanyOptions] = useState<{ id: string; name: string }[]>([]);
  const [contactOptions, setContactOptions] = useState<{ id: string; name: string; companyId: string }[]>([]);
  const [readOnlyRoom, setReadOnlyRoom] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("attendant_profiles").select("id, display_name").order("display_name"),
      supabase.from("chat_teams").select("id, name").order("name"),
      supabase.from("chat_tags").select("id, name").order("name"),
      supabase.from("contacts").select("id, name").eq("is_company", true).order("name"),
      supabase.from("company_contacts").select("id, name, company_id").order("name"),
    ]).then(([attRes, teamRes, tagRes, compRes, ccRes]) => {
      setAttendantOptions((attRes.data ?? []).map(a => ({ id: a.id, name: a.display_name })));
      setTeamOptions((teamRes.data ?? []).map(t => ({ id: t.id, name: t.name })));
      setTagOptions((tagRes.data ?? []).map(t => ({ id: t.id, name: t.name })));
      setCompanyOptions((compRes.data ?? []).map(c => ({ id: c.id, name: c.name })));
      setContactOptions((ccRes.data ?? []).map(c => ({ id: c.id, name: c.name, companyId: c.company_id })));
    });
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);

  const hasActiveFilters = filters.attendantIds.length > 0 || filters.teamIds.length > 0 || filters.tagIds.length > 0 || filters.scores.length > 0 || !!filters.contactId || !!filters.companyContactId;

  const clearFilters = () => setFilters(f => ({ ...f, attendantIds: [], teamIds: [], tagIds: [], scores: [], contactId: null, companyContactId: null, page: 0 }));

  const scoreColor = (score: number) => {
    if (score >= 4) return "text-green-600 bg-green-50 border-green-200";
    if (score === 3) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const renderStars = (score: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-3 w-3 ${s <= score ? (score >= 4 ? "fill-green-500 text-green-500" : score === 3 ? "fill-amber-500 text-amber-500" : "fill-red-500 text-red-500") : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  const toggleScore = (score: number) => {
    setFilters(f => ({ ...f, page: 0, scores: f.scores.includes(score) ? f.scores.filter(s => s !== score) : [...f.scores, score] }));
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ["Cliente", "Atendente", "Nota", "Comentário", "Duração (min)", "Tags", "Data"];
    const rows = records.map(r => [r.visitorName, r.attendantName, r.csatScore, (r.csatComment ?? "").replace(/"/g, '""'), r.durationMinutes ?? "", r.tags.map(t => t.name).join("; "), new Date(r.closedAt).toLocaleDateString("pt-BR")]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `csat-report-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const handleDeleteCsat = async (roomId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta avaliação CSAT? Ela será removida dos relatórios.")) return;
    setDeletingId(roomId);
    const { error } = await supabase.from("chat_rooms").update({ csat_score: null, csat_comment: null }).eq("id", roomId);
    setDeletingId(null);
    if (error) {
      toast.error("Erro ao excluir avaliação CSAT");
    } else {
      toast.success("Avaliação CSAT excluída com sucesso");
      refetch();
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title={t("csat.report.title")} subtitle={t("csat.report.subtitle")} />
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={records.length === 0}>
            <Download className="h-4 w-4 mr-2" />{t("csat.report.export")}
          </Button>
        </div>

        <div className="space-y-2">
          <FilterBar>
            <DateRangeFilter
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onChange={(from, to) => setFilters(f => ({ ...f, dateFrom: from, dateTo: to, page: 0 }))}
              maxRangeMonths={3}
            />
            <SearchableMultiSelect
              label={t("chat.gerencial.filter_by_attendant")}
              options={attendantOptions.map(a => ({ value: a.id, label: a.name }))}
              selected={filters.attendantIds}
              onChange={(v) => setFilters(f => ({ ...f, attendantIds: v, page: 0 }))}
              placeholder={t("chat.gerencial.filter_by_attendant")}
            />
            {teamOptions.length > 0 && (
              <SearchableMultiSelect
                label={t("csat.report.team")}
                options={teamOptions.map(t => ({ value: t.id, label: t.name }))}
                selected={filters.teamIds}
                onChange={(v) => setFilters(f => ({ ...f, teamIds: v, page: 0 }))}
                placeholder={t("csat.report.team")}
              />
            )}
            {tagOptions.length > 0 && (
              <SearchableMultiSelect
                label="Tag"
                options={tagOptions.map(t => ({ value: t.id, label: t.name }))}
                selected={filters.tagIds}
                onChange={(v) => setFilters(f => ({ ...f, tagIds: v, page: 0 }))}
                placeholder="Tag"
              />
            )}
            {companyOptions.length > 0 && (
              <SearchableMultiSelect
                label="Empresa"
                options={companyOptions.map(c => ({ value: c.id, label: c.name }))}
                selected={filters.contactId ? [filters.contactId] : []}
                onChange={(v) => setFilters(f => ({ ...f, contactId: v[0] ?? null, companyContactId: null, page: 0 }))}
                placeholder="Empresa"
              />
            )}
            {contactOptions.length > 0 && (
              <SearchableMultiSelect
                label="Contato"
                options={(filters.contactId ? contactOptions.filter(c => c.companyId === filters.contactId) : contactOptions).map(c => ({ value: c.id, label: c.name }))}
                selected={filters.companyContactId ? [filters.companyContactId] : []}
                onChange={(v) => setFilters(f => ({ ...f, companyContactId: v[0] ?? null, page: 0 }))}
                placeholder="Contato"
              />
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-[11px] text-muted-foreground" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" />Limpar
              </Button>
            )}
          </FilterBar>

          <div className="flex items-center gap-2 px-4">
            <span className="text-[11px] text-muted-foreground">{t("csat.report.filter_score")}:</span>
            {[1, 2, 3, 4, 5].map(score => (
              <button key={score} onClick={() => toggleScore(score)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors ${filters.scores.includes(score) ? scoreColor(score) : "text-muted-foreground border-border bg-background"}`}>
                <Star className={`h-2.5 w-2.5 ${filters.scores.includes(score) ? "" : "text-muted-foreground/50"}`} />{score}
              </button>
            ))}
            {filters.scores.length > 0 && (
              <button onClick={() => setFilters(f => ({ ...f, scores: [], page: 0 }))} className="text-[10px] text-muted-foreground underline">{t("csat.report.clear")}</button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
              <MetricCard title="Total de chats" value={stats.totalClosedChats} icon={MessageCircle} iconColor="text-muted-foreground" iconBgColor="bg-muted" subtitle="no período" />
              <MetricCard title="Avaliados" value={stats.totalEvaluations} icon={CheckCircle} iconColor="text-blue-500" iconBgColor="bg-blue-500/10" subtitle={`de ${stats.totalClosedChats} chats`} />
              <MetricCard title="Taxa de resposta" value={stats.responseRate != null ? `${stats.responseRate}%` : "—"} icon={Percent} iconColor="text-indigo-500" iconBgColor="bg-indigo-500/10" subtitle={`${stats.totalEvaluations} de ${stats.totalClosedChats}`} />
              <MetricCard title={t("csat.report.avg_csat")} value={stats.avgCsat != null ? `${stats.avgCsat}/5` : "—"} icon={Star} iconColor="text-yellow-500" iconBgColor="bg-yellow-500/10" />
              <MetricCard title={t("csat.report.positive")} value={stats.positivePercent != null ? `${stats.positivePercent}%` : "—"} icon={ThumbsUp} iconColor="text-green-500" iconBgColor="bg-green-500/10" subtitle={`${stats.positiveCount} avaliações`} />
              <MetricCard title={t("csat.report.negative")} value={stats.negativePercent != null ? `${stats.negativePercent}%` : "—"} icon={ThumbsDown} iconColor="text-red-500" iconBgColor="bg-red-500/10" subtitle={`${stats.negativeCount} avaliações`} />
            </div>

            {stats.attendantRanking.length > 0 && (
              <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <h3 className="text-sm font-semibold">Ranking de Atendentes</h3>
                  <span className="text-[11px] text-muted-foreground ml-1">({stats.attendantRanking.length})</span>
                </div>
                <CardContent className="px-4 pb-4 pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-10">#</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Atendente</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">Média</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">Avaliações</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">Chats</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">Taxa Resp.</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">% Positivo</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">% Negativo</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">Tempo Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.attendantRanking.map((entry, idx) => {
                        const posPercent = entry.totalEvals > 0 ? Math.round((entry.positiveCount / entry.totalEvals) * 100) : 0;
                        const negPercent = entry.totalEvals > 0 ? Math.round((entry.negativeCount / entry.totalEvals) * 100) : 0;
                        const fmtDuration = (mins: number | null) => {
                          if (mins == null) return "—";
                          if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                          return `${mins}m`;
                        };
                        return (
                          <TableRow key={entry.attendantId}>
                            <TableCell className="text-center">
                              {idx === 0 ? <span className="text-base">🥇</span> :
                               idx === 1 ? <span className="text-base">🥈</span> :
                               idx === 2 ? <span className="text-base">🥉</span> :
                               <span className="text-[13px] text-muted-foreground tabular-nums">{idx + 1}</span>}
                            </TableCell>
                            <TableCell className="text-[13px] font-medium">{entry.attendantName}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                {renderStars(Math.round(entry.avgCsat))}
                                <span className="text-[10px] font-medium tabular-nums">{entry.avgCsat}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-[13px] tabular-nums">{entry.totalEvals}</TableCell>
                            <TableCell className="text-center text-[13px] tabular-nums">{entry.totalClosedChats}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-[13px] font-medium tabular-nums ${entry.responseRate >= 50 ? "text-blue-600" : entry.responseRate >= 25 ? "text-amber-600" : "text-muted-foreground"}`}>
                                {entry.responseRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-[13px] font-medium tabular-nums ${posPercent >= 80 ? "text-green-600" : posPercent >= 50 ? "text-amber-600" : "text-red-600"}`}>
                                {posPercent}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-[13px] font-medium tabular-nums ${negPercent <= 10 ? "text-green-600" : negPercent <= 30 ? "text-amber-600" : "text-red-600"}`}>
                                {negPercent}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-[13px] tabular-nums text-muted-foreground">
                              {fmtDuration(entry.avgDurationMinutes)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title={t("csat.report.csat_by_day")} isEmpty={stats.csatByDay.length === 0} emptyText={t("chat.gerencial.no_data")}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.csatByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={t("csat.report.score_distribution")} isEmpty={!stats.scoreDistribution.some(d => d.count > 0)} emptyText={t("chat.gerencial.no_data")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.scoreDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="score" type="category" tickFormatter={s => `★ ${s}`} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div>
              <SectionLabel>{t("csat.report.results")} ({totalCount})</SectionLabel>
              <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                <div className="px-4 pt-4 pb-2 flex items-center justify-end">
                  <Select value={`${filters.sortBy}-${filters.sortDir}`} onValueChange={(v) => {
                    const [sortBy, sortDir] = v.split("-") as [CSATReportFilters["sortBy"], CSATReportFilters["sortDir"]];
                    setFilters(f => ({ ...f, sortBy, sortDir, page: 0 }));
                  }}>
                    <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">{t("csat.report.sort_date_desc")}</SelectItem>
                      <SelectItem value="date-asc">{t("csat.report.sort_date_asc")}</SelectItem>
                      <SelectItem value="score-desc">{t("csat.report.sort_score_desc")}</SelectItem>
                      <SelectItem value="score-asc">{t("csat.report.sort_score_asc")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CardContent className="px-4 pb-4 pt-0">
                  {records.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground py-8 text-center">{t("chat.gerencial.no_data")}</p>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("csat.report.client")}</TableHead>
                            <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.gerencial.attendant")}</TableHead>
                            <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">{t("csat.report.score")}</TableHead>
                            <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("csat.report.comment")}</TableHead>
                            <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">{t("csat.report.duration")}</TableHead>
                            <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tags</TableHead>
                            <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("csat.report.date")}</TableHead>
                            <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">{t("csat.report.action")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map(record => (
                            <TableRow key={record.roomId}>
                              <TableCell className="text-[13px] font-medium">{record.visitorName}</TableCell>
                              <TableCell className="text-[13px]">{record.attendantName}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  {renderStars(record.csatScore)}
                                  <span className="text-[10px] font-medium tabular-nums">{record.csatScore}</span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                {record.csatComment ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild><span className="text-[13px] truncate block cursor-default">{record.csatComment}</span></TooltipTrigger>
                                    <TooltipContent className="max-w-sm"><p>{record.csatComment}</p></TooltipContent>
                                  </Tooltip>
                                ) : <span className="text-muted-foreground text-[11px]">—</span>}
                              </TableCell>
                              <TableCell className="text-center text-[13px] tabular-nums">
                                {record.durationMinutes != null ? (record.durationMinutes < 60 ? `${record.durationMinutes}min` : `${Math.floor(record.durationMinutes / 60)}h${record.durationMinutes % 60}min`) : "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {record.tags.map(tag => (
                                    <Badge key={tag.id} variant="secondary" className="text-[10px]" style={{ borderColor: tag.color ?? undefined }}>{tag.name}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-[13px] whitespace-nowrap tabular-nums">{new Date(record.closedAt).toLocaleDateString("pt-BR")}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => setReadOnlyRoom({ id: record.roomId, name: record.visitorName })}>
                                    <MessageSquare className="h-3 w-3" />{t("csat.report.view_chat")}
                                  </Button>
                                  {(isAdmin || isMaster) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" disabled={deletingId === record.roomId} onClick={() => handleDeleteCsat(record.roomId)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Excluir avaliação CSAT</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-[11px] text-muted-foreground">{t("csat.report.page")} {filters.page + 1} / {totalPages}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" disabled={filters.page === 0} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" disabled={filters.page >= totalPages - 1} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}><ChevronRight className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <ReadOnlyChatDialog roomId={readOnlyRoom?.id ?? null} visitorName={readOnlyRoom?.name ?? ""} open={!!readOnlyRoom} onOpenChange={(open) => !open && setReadOnlyRoom(null)} />
    </>
  );
};

export default AdminCSATReport;
