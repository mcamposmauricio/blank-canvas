import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";

import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboardStats, type DashboardFilters } from "@/hooks/useDashboardStats";
import { useAttendants } from "@/hooks/useAttendants";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MessageSquare, CalendarDays, Star, CheckCircle, Clock, AlertTriangle, Zap, RefreshCw, Radio, X } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionLabel } from "@/components/ui/section-label";
import { FilterBar } from "@/components/ui/filter-bar";
import { ChartCard } from "@/components/ui/chart-card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { format, subDays } from "date-fns";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

const RESOLUTION_COLORS: Record<string, string> = {
  resolved: "hsl(142, 71%, 45%)",
  pending: "hsl(38, 92%, 50%)",
  escalated: "hsl(0, 84%, 60%)",
  inactive: "hsl(220, 9%, 46%)",
  archived: "hsl(217, 91%, 60%)",
};

const AdminDashboardGerencial = () => {
  const { t } = useLanguage();
  const { attendants } = useAttendants();
  const [filters, setFilters] = useState<DashboardFilters>(() => ({
    period: "week",
    dateFrom: fmt(subDays(new Date(), 6)),
    dateTo: fmt(new Date()),
  }));
  const { stats, loading, refetch, realtimeEnabled, toggleRealtime } = useDashboardStats(filters);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [companyOptions, setCompanyOptions] = useState<{ id: string; name: string }[]>([]);
  const [contactOptions, setContactOptions] = useState<{ id: string; name: string; companyId: string }[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("chat_service_categories").select("id, name").order("name"),
      supabase.from("chat_tags").select("id, name").order("name"),
      supabase.from("contacts").select("id, name").eq("is_company", true).order("name"),
      supabase.from("company_contacts").select("id, name, company_id").order("name"),
      supabase.from("chat_teams").select("id, name").order("name"),
    ]).then(([catRes, tagRes, compRes, ccRes, teamRes]) => {
      setCategories(catRes.data ?? []);
      setTags(tagRes.data ?? []);
      setCompanyOptions((compRes.data ?? []).map((c) => ({ id: c.id, name: c.name })));
      setContactOptions((ccRes.data ?? []).map((c) => ({ id: c.id, name: c.name, companyId: c.company_id })));
      setTeams((teamRes.data ?? []).map(t => ({ id: t.id, name: t.name })));
    });
  }, []);

  const hasActiveFilters = (filters.attendantIds?.length ?? 0) > 0 || (filters.teamIds?.length ?? 0) > 0 || (filters.tagIds?.length ?? 0) > 0 || !!filters.categoryId || !!filters.contactId || !!filters.companyContactId;

  const clearFilters = () => setFilters(f => ({ period: f.period, dateFrom: f.dateFrom, dateTo: f.dateTo }));

  const resDistTotal = stats.resolutionDistribution.reduce((s, d) => s + d.count, 0);

  const kpis = [
    { title: t("chat.gerencial.total_chats"), value: stats.totalChats, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: t("chat.gerencial.chats_today"), value: stats.chatsToday, icon: CalendarDays, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: t("chat.dashboard.csat_avg"), value: stats.avgCsat != null ? `${stats.avgCsat}/5` : "—", icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { title: t("chat.gerencial.resolution_rate"), value: stats.resolutionRate != null ? `${stats.resolutionRate}%` : "—", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: t("chat.gerencial.avg_resolution"), value: stats.avgResolutionMinutes != null ? `${stats.avgResolutionMinutes}min` : "—", icon: Clock, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: t("chat.gerencial.avg_first_response"), value: stats.avgFirstResponseMinutes != null ? `${stats.avgFirstResponseMinutes}min` : "—", icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: t("chat.gerencial.unresolved_chats"), value: stats.unresolvedChats, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={t("chat.gerencial.title")} subtitle={t("chat.gerencial.subtitle")} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />Atualizar
          </Button>
          <Button variant={realtimeEnabled ? "default" : "outline"} size="sm" className="h-8 gap-1.5 text-[11px]" onClick={toggleRealtime}>
            <Radio className={`h-3.5 w-3.5 ${realtimeEnabled ? "animate-pulse" : ""}`} />
            Tempo real: {realtimeEnabled ? "Ligado" : "Desligado"}
          </Button>
        </div>
      </div>

      <FilterBar>
        <DateRangeFilter
          dateFrom={filters.dateFrom ?? null}
          dateTo={filters.dateTo ?? null}
          onChange={(from, to) => setFilters(f => ({ ...f, dateFrom: from, dateTo: to }))}
          maxRangeMonths={3}
        />
        <SearchableMultiSelect
          label={t("chat.gerencial.filter_by_attendant")}
          options={attendants.map(a => ({ value: a.id, label: a.display_name }))}
          selected={filters.attendantIds ?? []}
          onChange={(v) => setFilters(f => ({ ...f, attendantIds: v }))}
        />
        {teams.length > 0 && (
          <SearchableMultiSelect
            label="Time"
            options={teams.map(t => ({ value: t.id, label: t.name }))}
            selected={filters.teamIds ?? []}
            onChange={(v) => setFilters(f => ({ ...f, teamIds: v }))}
          />
        )}
        {categories.length > 0 && (
          <SearchableMultiSelect
            label={t("chat.gerencial.filter_by_category")}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            selected={filters.categoryId ? [filters.categoryId] : []}
            onChange={(v) => setFilters(f => ({ ...f, categoryId: v[0] ?? null }))}
          />
        )}
        {tags.length > 0 && (
          <SearchableMultiSelect
            label="Tag"
            options={tags.map(tag => ({ value: tag.id, label: tag.name }))}
            selected={filters.tagIds ?? []}
            onChange={(v) => setFilters(f => ({ ...f, tagIds: v }))}
          />
        )}
        {companyOptions.length > 0 && (
          <SearchableMultiSelect
            label="Empresa"
            options={companyOptions.map(c => ({ value: c.id, label: c.name }))}
            selected={filters.contactId ? [filters.contactId] : []}
            onChange={(v) => setFilters(f => ({ ...f, contactId: v[0] ?? null, companyContactId: null }))}
          />
        )}
        {contactOptions.length > 0 && (
          <SearchableMultiSelect
            label="Contato"
            options={(filters.contactId ? contactOptions.filter(c => c.companyId === filters.contactId) : contactOptions).map(c => ({ value: c.id, label: c.name }))}
            selected={filters.companyContactId ? [filters.companyContactId] : []}
            onChange={(v) => setFilters(f => ({ ...f, companyContactId: v[0] ?? null }))}
          />
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-[11px] text-muted-foreground" onClick={clearFilters}>
            <X className="h-3 w-3 mr-1" />Limpar
          </Button>
        )}
      </FilterBar>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <>
          <div>
            <SectionLabel>Métricas do Período</SectionLabel>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {kpis.map((kpi) => (
                <MetricCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} iconColor={kpi.color} iconBgColor={kpi.bg} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title={t("chat.gerencial.conversations_per_day")} isEmpty={stats.chartData.length === 0} emptyText={t("chat.gerencial.no_data")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("chat.gerencial.csat_evolution")} isEmpty={stats.csatByDay.length === 0} emptyText={t("chat.gerencial.no_data")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.csatByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("chat.gerencial.peak_hours")} isEmpty={!stats.chatsByHour.some(h => h.count > 0)} emptyText={t("chat.gerencial.no_data")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chatsByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(h) => `${h}:00`} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Resolution Distribution - Stacked Bar Chart */}
            <ChartCard
              title={`${t("chat.gerencial.resolution_distribution")} — ${resDistTotal} encerrados`}
              isEmpty={stats.resolutionByDay.length === 0}
              emptyText={t("chat.gerencial.no_data")}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.resolutionByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null;
                      const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
                      return (
                        <div className="bg-popover border rounded-lg p-2 shadow-md text-[12px] space-y-0.5">
                          <p className="font-medium">{label} — {total} total</p>
                          {payload.map(p => (
                            <div key={p.dataKey} className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                              <span>{String(p.dataKey)}</span>
                              <span className="ml-auto font-medium tabular-nums">{String(p.value)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value: string) => <span className="text-[11px] text-foreground">{value}</span>}
                  />
                  <Bar dataKey="resolved" stackId="1" fill={RESOLUTION_COLORS.resolved} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="1" fill={RESOLUTION_COLORS.pending} />
                  <Bar dataKey="escalated" stackId="1" fill={RESOLUTION_COLORS.escalated} />
                  <Bar dataKey="inactive" stackId="1" fill={RESOLUTION_COLORS.inactive} />
                  <Bar dataKey="archived" stackId="1" fill={RESOLUTION_COLORS.archived} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {stats.attendantPerformance.length > 0 && (
            <div>
              <SectionLabel>{t("chat.gerencial.attendant_performance")}</SectionLabel>
              <Card className="rounded-xl border border-white/[0.06] bg-card shadow-sm">
                <CardContent className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("chat.gerencial.attendant")}</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.chats_col")}</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.csat_col")}</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.resolution_col")}</TableHead>
                        <TableHead className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-right">{t("chat.gerencial.avg_time_col")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.attendantPerformance.map((att) => (
                        <TableRow key={att.name}>
                          <TableCell className="text-[13px] font-medium">{att.name}</TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.chats}</TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.csat != null ? `${att.csat}/5` : "—"}</TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.resolutionRate != null ? `${att.resolutionRate}%` : "—"}</TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums font-medium">{att.avgResolution != null ? `${att.avgResolution}min` : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboardGerencial;
