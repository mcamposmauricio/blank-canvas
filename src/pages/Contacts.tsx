import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Building2, Users, Upload, ChevronDown, Filter, X, ChevronLeft, ChevronRight, LayoutGrid, LayoutList } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { CompanyCard } from "@/components/CompanyCard";
import { CompanyForm } from "@/components/CompanyForm";
import { CompanyDetailsSheet } from "@/components/CompanyDetailsSheet";
import { QuickContactForm } from "@/components/QuickContactForm";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { sanitizeFilterValue } from "@/lib/utils";

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_primary: boolean;
  created_at: string;
  external_id: string | null;
  public_token: string | null;
}

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  email: string;
  phone: string | null;
  company_document: string | null;
  company_sector: string | null;
  street: string | null;
  street_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_at: string;
  contacts_count: number;
  primary_contact: CompanyContact | null;
  cs_status: string | null;
  health_score: number | null;
  service_priority: string | null;
  last_nps_score: number | null;
  mrr: number | null;
  custom_fields: any;
  is_active: boolean;
}

const PAGE_SIZE = 50;

const Contacts = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [addCompanyDialogOpen, setAddCompanyDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [editCompanyData, setEditCompanyData] = useState<Company | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);
  const [bulkImportType, setBulkImportType] = useState<"companies" | "contacts" | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [sectorFilter, setSectorFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [csStatusFilter, setCsStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");
  const [npsFilter, setNpsFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  // Filter options from DB
  const [filterOptions, setFilterOptions] = useState<{
    sectors: string[]; states: string[]; cities: string[];
    csStatuses: string[]; priorities: string[];
    hasHealth: boolean; hasNps: boolean;
  }>({ sectors: [], states: [], cities: [], csStatuses: [], priorities: [], hasHealth: false, hasNps: false });
  
  const { toast } = useToast();
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('contacts', 'edit');
  const canDelete = hasPermission('contacts', 'delete');
  const { id: paramCompanyId } = useParams();

  // Auto-open company sheet from URL param
  useEffect(() => {
    if (paramCompanyId) setSelectedCompanyId(paramCompanyId);
  }, [paramCompanyId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchFilter);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [sectorFilter, stateFilter, cityFilter, csStatusFilter, priorityFilter, healthFilter, npsFilter, statusFilter]);

  // Fetch filter options once
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch companies when page/search/filters change
  useEffect(() => {
    fetchCompanies();
  }, [page, debouncedSearch, sectorFilter, stateFilter, cityFilter, csStatusFilter, priorityFilter, healthFilter, npsFilter, statusFilter]);

  const fetchFilterOptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("contacts")
      .select("company_sector, state, city, cs_status, service_priority, health_score, last_nps_score")
      .eq("is_company", true);

    if (!data) return;

    const sectors = [...new Set(data.map(c => c.company_sector).filter(Boolean))] as string[];
    const states = [...new Set(data.map(c => c.state).filter(Boolean))] as string[];
    const cities = [...new Set(data.map(c => c.city).filter(Boolean))] as string[];
    const csStatuses = [...new Set(data.map(c => c.cs_status).filter(Boolean))] as string[];
    const priorities = [...new Set(data.map(c => c.service_priority).filter(Boolean))] as string[];
    const hasHealth = data.some(c => c.health_score != null);
    const hasNps = data.some(c => c.last_nps_score != null);

    setFilterOptions({ sectors: sectors.sort(), states: states.sort(), cities: cities.sort(), csStatuses: csStatuses.sort(), priorities: priorities.sort(), hasHealth, hasNps });
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("contacts")
        .select("*", { count: "exact" })
        .eq("is_company", true)
        .order("name");

      // Server-side search
      if (debouncedSearch.trim()) {
        const sanitized = sanitizeFilterValue(debouncedSearch.trim());
        query = query.or(`name.ilike.%${sanitized}%,trade_name.ilike.%${sanitized}%,company_document.ilike.%${sanitized}%`);
      }

      // Server-side filters
      if (sectorFilter) query = query.eq("company_sector", sectorFilter);
      if (stateFilter) query = query.eq("state", stateFilter);
      if (cityFilter) query = query.eq("city", cityFilter);
      if (csStatusFilter) query = query.eq("cs_status", csStatusFilter);
      if (priorityFilter) query = query.eq("service_priority", priorityFilter);
      if (healthFilter) {
        if (healthFilter === "healthy") query = query.gte("health_score", 70);
        else if (healthFilter === "warning") query = query.gte("health_score", 40).lt("health_score", 70);
        else if (healthFilter === "critical") query = query.lt("health_score", 40);
      }
      if (npsFilter) {
        if (npsFilter === "promoter") query = query.gte("last_nps_score", 9);
        else if (npsFilter === "neutral") query = query.gte("last_nps_score", 7).lte("last_nps_score", 8);
        else if (npsFilter === "detractor") query = query.lte("last_nps_score", 6).not("last_nps_score", "is", null);
        else if (npsFilter === "none") query = query.is("last_nps_score", null);
      }

      // Pagination
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data: companiesData, error: companiesError, count } = await query;
      if (companiesError) throw companiesError;

      setTotalCount(count || 0);

      const companyIds = (companiesData || []).map(c => c.id);
      
      const BATCH_SIZE = 100;
      let contactsData: any[] = [];
      if (companyIds.length > 0) {
        for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
          const batch = companyIds.slice(i, i + BATCH_SIZE);
          const { data, error: contactsError } = await supabase
            .from("company_contacts")
            .select("*")
            .in("company_id", batch);
          if (contactsError) throw contactsError;
          contactsData.push(...(data || []));
        }
      }

      const companiesWithContacts: Company[] = (companiesData || []).map(company => {
        const companyContactsList = contactsData.filter(c => c.company_id === company.id);
        const primaryContact = companyContactsList.find(c => c.is_primary) || null;
        
        return {
          ...company,
          contacts_count: companyContactsList.length,
          primary_contact: primaryContact ? {
            id: primaryContact.id,
            name: primaryContact.name,
            email: primaryContact.email,
            phone: primaryContact.phone,
            role: primaryContact.role,
            department: primaryContact.department,
            is_primary: primaryContact.is_primary,
            created_at: primaryContact.created_at,
            external_id: primaryContact.external_id,
            public_token: primaryContact.public_token,
          } : null,
        };
      });

      setCompanies(companiesWithContacts);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyClick = useCallback((company: Company) => {
    setSelectedCompanyId(company.id);
  }, []);

  const handleAddCompany = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("auth.error"));

      const { error } = await supabase.from("contacts").insert({
        user_id: user.id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        is_company: true,
        company_document: data.company_document || null,
        company_sector: data.company_sector || null,
        trade_name: data.trade_name || null,
        external_id: data.external_id || null,
        street: data.street || null,
        street_number: data.street_number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        service_priority: data.service_priority || 'normal',
        service_category_id: data.service_category_id || null,
        custom_fields: data.custom_fields && Object.keys(data.custom_fields).length > 0 ? data.custom_fields : {},
      } as any);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("companies.addSuccess"),
      });

      setAddCompanyDialogOpen(false);
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditCompany = async (data: any) => {
    if (!editCompanyData) return;

    try {
      const { error } = await supabase
        .from("contacts")
        .update({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          company_document: data.company_document || null,
          company_sector: data.company_sector || null,
          trade_name: data.trade_name || null,
          external_id: data.external_id || null,
          street: data.street || null,
          street_number: data.street_number || null,
          complement: data.complement || null,
          neighborhood: data.neighborhood || null,
          city: data.city || null,
          state: data.state || null,
          zip_code: data.zip_code || null,
          service_priority: data.service_priority || 'normal',
          service_category_id: data.service_category_id || null,
          custom_fields: data.custom_fields && Object.keys(data.custom_fields).length > 0 ? data.custom_fields : {},
        } as any)
        .eq("id", editCompanyData.id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("companies.updateSuccess"),
      });

      setEditCompanyData(null);
      fetchCompanies();
      
      if (selectedCompanyId === editCompanyData.id) {
        setSelectedCompanyId(null);
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteCompanyId) return;
    
    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", deleteCompanyId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("companies.deleteSuccess"),
      });

      setDeleteCompanyId(null);
      if (selectedCompanyId === deleteCompanyId) {
        setSelectedCompanyId(null);
      }
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const showingFrom = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, totalCount);

  const activeFilterCount = [sectorFilter, stateFilter, cityFilter, csStatusFilter, priorityFilter, healthFilter, npsFilter].filter(Boolean).length;

  // Filter cities by selected state
  const filteredCities = stateFilter
    ? filterOptions.cities // already filtered from DB, but we should re-fetch — for simplicity keep as-is
    : filterOptions.cities;

  const addDropdownContent = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("companies.add")}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setAddCompanyDialogOpen(true)}>
          <Building2 className="mr-2 h-4 w-4" />
          {t("companies.addCompanyManual")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setAddContactDialogOpen(true)}>
          <Users className="mr-2 h-4 w-4" />
          {t("companies.addContactManual")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setBulkImportType("companies")}>
          <Upload className="mr-2 h-4 w-4" />
          {t("companies.importCompaniesCsv")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setBulkImportType("contacts")}>
          <Upload className="mr-2 h-4 w-4" />
          {t("companies.importContactsCsv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t("companies.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("companies.subtitle")}</p>
          </div>
          {canEdit && <div className="shrink-0">{addDropdownContent}</div>}
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative max-w-md flex-1 min-w-[140px] sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("companies.searchPlaceholder")}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setViewMode("table")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setSectorFilter(""); setStateFilter(""); setCityFilter(""); setCsStatusFilter(""); setPriorityFilter(""); setHealthFilter(""); setNpsFilter(""); }}>
                <X className="h-4 w-4 mr-1" />
                {activeFilterCount} {t("companies.activeFilters")}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap bg-muted/30 rounded-xl px-4 py-3">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            {filterOptions.sectors.length > 0 && (
              <Select value={sectorFilter} onValueChange={(v) => setSectorFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder={t("companies.filterBySector")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("companies.allSectors")}</SelectItem>
                  {filterOptions.sectors.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filterOptions.states.length > 0 && (
              <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v === "all" ? "" : v); setCityFilter(""); }}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder={t("companies.filterByState")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("companies.allStates")}</SelectItem>
                  {filterOptions.states.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filteredCities.length > 0 && (
              <Select value={cityFilter} onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder={t("companies.filterByCity")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("companies.allCities")}</SelectItem>
                  {filteredCities.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filterOptions.csStatuses.length > 0 && (
              <Select value={csStatusFilter} onValueChange={(v) => setCsStatusFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder={t("companies.filterByKanban")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("companies.allKanbanStages")}</SelectItem>
                  {filterOptions.csStatuses.map(s => (
                    <SelectItem key={s} value={s}>{t(`cs.status.${s}`) !== `cs.status.${s}` ? t(`cs.status.${s}`) : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filterOptions.priorities.length > 0 && (
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder={t("companies.filterByPriority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("companies.allPriorities")}</SelectItem>
                  {filterOptions.priorities.map(s => (
                    <SelectItem key={s} value={s}>{t(`companies.priority.${s}`) !== `companies.priority.${s}` ? t(`companies.priority.${s}`) : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filterOptions.hasHealth && (
              <Select value={healthFilter} onValueChange={(v) => setHealthFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder={t("companies.filterByHealth")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("companies.allHealthScores")}</SelectItem>
                  <SelectItem value="healthy">{t("companies.health.healthy")}</SelectItem>
                  <SelectItem value="warning">{t("companies.health.warning")}</SelectItem>
                  <SelectItem value="critical">{t("companies.health.critical")}</SelectItem>
                </SelectContent>
              </Select>
            )}
            {filterOptions.hasNps && (
              <Select value={npsFilter} onValueChange={(v) => setNpsFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder={t("companies.filterByNPS")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("companies.allNPS")}</SelectItem>
                  <SelectItem value="promoter">{t("companies.nps.promoter")}</SelectItem>
                  <SelectItem value="neutral">{t("companies.nps.neutral")}</SelectItem>
                  <SelectItem value="detractor">{t("companies.nps.detractor")}</SelectItem>
                  <SelectItem value="none">{t("companies.nps.noResponse")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        ) : companies.length === 0 && page === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("companies.noCompanies")}</p>
            {canEdit && <div className="mt-4">{addDropdownContent}</div>}
          </Card>
        ) : (
          <>
            {viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onClick={() => handleCompanyClick(company)}
                    onDelete={() => setDeleteCompanyId(company.id)}
                    canDelete={canDelete}
                  />
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("contacts.name")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("contacts.email")}</TableHead>
                      <TableHead className="hidden lg:table-cell">Setor</TableHead>
                      <TableHead className="hidden lg:table-cell">Estado</TableHead>
                      <TableHead className="text-center">Health</TableHead>
                      <TableHead className="text-center">NPS</TableHead>
                      <TableHead className="text-right hidden md:table-cell">MRR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow
                        key={company.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleCompanyClick(company)}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <p className="truncate max-w-[200px]">{company.trade_name || company.name}</p>
                            {company.trade_name && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{company.name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[180px]">
                          {company.email}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {company.company_sector || "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {company.state || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {company.health_score != null ? (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                company.health_score >= 70
                                  ? "bg-primary/10 text-primary"
                                  : company.health_score >= 40
                                  ? "bg-warning/10 text-warning"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {company.health_score}%
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {company.last_nps_score != null ? (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                company.last_nps_score >= 9
                                  ? "bg-primary/10 text-primary"
                                  : company.last_nps_score >= 7
                                  ? "bg-warning/10 text-warning"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {company.last_nps_score}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell text-sm">
                          {company.mrr
                            ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(company.mrr)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  {t("pagination.showing").replace("{from}", String(showingFrom)).replace("{to}", String(showingTo)).replace("{total}", String(totalCount))}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("pagination.previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {t("pagination.pageOf").replace("{page}", String(page + 1)).replace("{total}", String(totalPages))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    {t("pagination.next")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add Company Dialog */}
        <Dialog open={addCompanyDialogOpen} onOpenChange={setAddCompanyDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("companies.addCompany")}</DialogTitle>
            </DialogHeader>
            <CompanyForm
              onSubmit={handleAddCompany}
              onCancel={() => setAddCompanyDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Add Contact Dialog */}
        <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("companies.addContact")}</DialogTitle>
            </DialogHeader>
            <QuickContactForm
              onSuccess={() => {
                setAddContactDialogOpen(false);
                fetchCompanies();
              }}
              onCancel={() => setAddContactDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Company Dialog */}
        <Dialog open={!!editCompanyData} onOpenChange={(open) => !open && setEditCompanyData(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("companies.editCompany")}</DialogTitle>
            </DialogHeader>
            {editCompanyData && (
              <CompanyForm
                initialData={{
                  name: editCompanyData.name,
                  email: editCompanyData.email,
                  phone: editCompanyData.phone || "",
                  trade_name: editCompanyData.trade_name || "",
                  company_document: editCompanyData.company_document || "",
                  company_sector: editCompanyData.company_sector || "",
                  external_id: (editCompanyData as any).external_id || "",
                  street: editCompanyData.street || "",
                  street_number: editCompanyData.street_number || "",
                  complement: editCompanyData.complement || "",
                  neighborhood: editCompanyData.neighborhood || "",
                  city: editCompanyData.city || "",
                  state: editCompanyData.state || "",
                  zip_code: editCompanyData.zip_code || "",
                  service_priority: (editCompanyData as any).service_priority || "normal",
                  service_category_id: (editCompanyData as any).service_category_id || "",
                  custom_fields: (editCompanyData as any).custom_fields || {},
                }}
                onSubmit={handleEditCompany}
                onCancel={() => setEditCompanyData(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <BulkImportDialog
          open={!!bulkImportType}
          onOpenChange={(open) => !open && setBulkImportType(null)}
          type={bulkImportType || "companies"}
          onSuccess={fetchCompanies}
        />

        {/* Unified Company Details Sheet */}
        <CompanyDetailsSheet
          companyId={selectedCompanyId}
          onClose={() => {
            setSelectedCompanyId(null);
            fetchCompanies();
          }}
          onEdit={() => {
            const company = companies.find(c => c.id === selectedCompanyId);
            if (company) setEditCompanyData(company);
          }}
          canEdit={canEdit}
          canDelete={canDelete}
        />

        {/* Delete Company Confirmation */}
        <AlertDialog open={!!deleteCompanyId} onOpenChange={() => setDeleteCompanyId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("companies.deleteCompany")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("companies.deleteConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteCompany}
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default Contacts;
