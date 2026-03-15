import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Users, Loader2, Copy, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonDetailsSheet } from "@/components/PersonDetailsSheet";
import { sanitizeFilterValue } from "@/lib/utils";

interface PersonWithCompany {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_primary: boolean;
  public_token: string | null;
  chat_total: number | null;
  chat_avg_csat: number | null;
  chat_last_at: string | null;
  company_id: string;
  external_id: string | null;
  created_at: string | null;
  company_name: string;
  company_trade_name: string | null;
}

const PAGE_SIZE = 50;

const People = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<PersonWithCompany | null>(null);
  const [companyFilter, setCompanyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [people, setPeople] = useState<PersonWithCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Filter options
  const [filterOptions, setFilterOptions] = useState<{
    companies: string[]; roles: string[]; departments: string[];
  }>({ companies: [], roles: [], departments: [] });
  const { t } = useLanguage();
  const { toast } = useToast();
  const { id: paramPersonId } = useParams();

  // Auto-open person sheet from URL param
  useEffect(() => {
    if (!paramPersonId) return;
    (async () => {
      const { data: contact } = await supabase.from("company_contacts").select("*").eq("id", paramPersonId).maybeSingle();
      if (!contact) return;
      const { data: company } = await supabase.from("contacts").select("name, trade_name").eq("id", contact.company_id).maybeSingle();
      setSelectedPerson({
        id: contact.id, name: contact.name, email: contact.email, phone: contact.phone,
        role: contact.role, department: contact.department, is_primary: contact.is_primary ?? false,
        public_token: contact.public_token, chat_total: contact.chat_total,
        chat_avg_csat: contact.chat_avg_csat, chat_last_at: contact.chat_last_at,
        company_id: contact.company_id, external_id: contact.external_id,
        created_at: contact.created_at,
        company_name: company?.name ?? "-", company_trade_name: company?.trade_name ?? null,
      });
    })();
  }, [paramPersonId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [companyFilter, roleFilter, departmentFilter]);

  // Fetch filter options once
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch people when page/search/filters change
  useEffect(() => {
    fetchPeople();
  }, [page, debouncedSearch, companyFilter, roleFilter, departmentFilter]);

  const fetchFilterOptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("company_contacts")
      .select("role, department");

    if (!data) return;

    const roles = [...new Set(data.map(c => c.role).filter(Boolean))] as string[];
    const departments = [...new Set(data.map(c => c.department).filter(Boolean))] as string[];

    // Fetch company names for filter
    const { data: companiesData } = await supabase
      .from("contacts")
      .select("name, trade_name")
      .eq("is_company", true);

    const companies = [...new Set((companiesData || []).map(c => c.trade_name || c.name).filter(Boolean))] as string[];

    setFilterOptions({
      companies: companies.sort(),
      roles: roles.sort(),
      departments: departments.sort(),
    });
  };

  const fetchPeople = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("company_contacts")
        .select("*", { count: "exact" })
        .order("name");

      // Server-side search
      if (debouncedSearch.trim()) {
        const sanitized = sanitizeFilterValue(debouncedSearch.trim());
        query = query.or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
      }

      // Server-side filters
      if (roleFilter) query = query.eq("role", roleFilter);
      if (departmentFilter) query = query.eq("department", departmentFilter);

      // Pagination
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data: contacts, error, count } = await query;
      if (error) throw error;

      setTotalCount(count || 0);

      if (!contacts || contacts.length === 0) {
        setPeople([]);
        return;
      }

      // Fetch companies for current page's contacts only
      const companyIds = [...new Set(contacts.map((c) => c.company_id))];
      const BATCH_SIZE = 100;
      let companies: any[] = [];
      for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
        const batch = companyIds.slice(i, i + BATCH_SIZE);
        const { data, error: companiesError } = await supabase
          .from("contacts")
          .select("id, name, trade_name")
          .in("id", batch);
        if (companiesError) throw companiesError;
        companies.push(...(data || []));
      }

      const companyMap = new Map(
        companies.map((c) => [c.id, { name: c.name, trade_name: c.trade_name }])
      );

      const mapped = contacts.map((contact): PersonWithCompany => {
        const company = companyMap.get(contact.company_id);
        return {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          role: contact.role,
          department: contact.department,
          is_primary: contact.is_primary ?? false,
          public_token: contact.public_token,
          chat_total: contact.chat_total,
          chat_avg_csat: contact.chat_avg_csat,
          chat_last_at: contact.chat_last_at,
          company_id: contact.company_id,
          external_id: contact.external_id,
          created_at: contact.created_at,
          company_name: company?.name || "-",
          company_trade_name: company?.trade_name || null,
        };
      });

      // Client-side company name filter (since it's a join)
      const filtered = companyFilter
        ? mapped.filter(p => (p.company_trade_name || p.company_name) === companyFilter)
        : mapped;

      setPeople(filtered);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const copyPortalLink = (token: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: t("people.linkCopied") });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const showingFrom = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, totalCount);
  const activeFilterCount = [companyFilter, roleFilter, departmentFilter].filter(Boolean).length;

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {t("people.title")}
              {!isLoading && (
                <Badge variant="secondary" className="ml-3 text-sm font-normal">
                  {totalCount}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("people.subtitle")}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-md flex-1 min-w-[140px] sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("people.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {filterOptions.companies.length > 1 && (
            <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={t("people.filterByCompany")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("people.allCompanies")}</SelectItem>
                {filterOptions.companies.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {filterOptions.roles.length > 1 && (
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder={t("people.filterByRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("people.allRoles")}</SelectItem>
                {filterOptions.roles.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {filterOptions.departments.length > 1 && (
            <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("people.filterByDepartment")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("people.allDepartments")}</SelectItem>
                {filterOptions.departments.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setCompanyFilter(""); setRoleFilter(""); setDepartmentFilter(""); }}>
              <X className="h-4 w-4 mr-1" />
              {activeFilterCount} {t("people.activeFilters")}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        ) : people.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p>{t("people.noResults")}</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("contacts.name")}</TableHead>
                    <TableHead>{t("contacts.email")}</TableHead>
                    <TableHead>{t("people.company")}</TableHead>
                     <TableHead className="hidden md:table-cell">{t("people.role")}</TableHead>
                     <TableHead className="hidden md:table-cell">{t("people.phone")}</TableHead>
                     <TableHead className="text-center hidden lg:table-cell">{t("people.chats")}</TableHead>
                     <TableHead className="text-center hidden lg:table-cell">{t("people.csat")}</TableHead>
                     <TableHead className="text-center hidden md:table-cell">{t("people.portal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((person) => (
                    <TableRow
                      key={person.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedPerson(person)}
                    >
                      <TableCell className="font-medium">
                        {person.name}
                        {person.is_primary && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            ★
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{person.email}</TableCell>
                      <TableCell>{person.company_trade_name || person.company_name}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{person.role || "-"}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{person.phone || "-"}</TableCell>
                      <TableCell className="text-center hidden lg:table-cell">{person.chat_total || 0}</TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {person.chat_avg_csat
                          ? `${Number(person.chat_avg_csat).toFixed(1)}/5`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {person.public_token ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => copyPortalLink(person.public_token, e)}
                            title={t("people.copyLink")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
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

        <PersonDetailsSheet
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
    </div>
  );
};

export default People;
