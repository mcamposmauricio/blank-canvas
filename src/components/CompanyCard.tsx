import { Building2, Users, Star, MapPin, ChevronRight, Trash2, Copy, Heart, TrendingUp, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { CustomFieldsInline } from "@/components/CustomFieldsDisplay";

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
}

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  email: string;
  phone: string | null;
  company_document: string | null;
  company_sector: string | null;
  city: string | null;
  state: string | null;
  contacts_count: number;
  primary_contact: CompanyContact | null;
  health_score?: number | null;
  mrr?: number | null;
  last_nps_score?: number | null;
  custom_fields?: any;
}

interface CompanyCardProps {
  company: Company;
  onClick: () => void;
  onDelete: () => void;
  canDelete?: boolean;
}

export function CompanyCard({ company, onClick, onDelete, canDelete = true }: CompanyCardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const copyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(company.id);
    toast({ title: t("companyDetails.copied") });
  };

  const truncateId = (id: string) => `${id.slice(0, 8)}...`;
  
  return (
    <Card 
      className="p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight">{company.name}</h3>
            {company.trade_name && company.trade_name !== company.name && (
              <p className="text-sm text-muted-foreground">{company.trade_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1">
          <code className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
            ID: {truncateId(company.id)}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={copyId}
          >
            <Copy className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
        {company.company_document && (
          <span className="text-[10px] text-muted-foreground">
            CNPJ: {company.company_document}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {company.company_sector && (
          <Badge variant="secondary" className="text-xs">
            {company.company_sector}
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          <Users className="h-3 w-3 mr-1" />
          {company.contacts_count} {company.contacts_count === 1 ? t("companies.contact") : t("companies.contacts")}
        </Badge>
        {company.health_score != null && (
          <Badge
            variant="secondary"
            className={`text-xs ${
              company.health_score >= 70
                ? "bg-primary/15 text-primary"
                : company.health_score >= 40
                ? "bg-warning/15 text-warning"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            <Heart className="h-3 w-3 mr-1" />
            {company.health_score}%
          </Badge>
        )}
        {company.last_nps_score != null && (
          <Badge
            variant="secondary"
            className={`text-xs ${
              company.last_nps_score >= 9
                ? "bg-primary/15 text-primary"
                : company.last_nps_score >= 7
                ? "bg-warning/15 text-warning"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            NPS {company.last_nps_score}
          </Badge>
        )}
      </div>

      {(company.mrr != null && company.mrr > 0) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <DollarSign className="h-3 w-3" />
          MRR: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(company.mrr)}
        </div>
      )}

      {company.custom_fields && (
        <div className="mb-2">
          <CustomFieldsInline fields={company.custom_fields} target="company" maxFields={2} />
        </div>
      )}

      {(company.city || company.state) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3 w-3" />
          {[company.city, company.state].filter(Boolean).join(" - ")}
        </div>
      )}

      {company.primary_contact && (
        <div className="border-t pt-3 mt-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{company.primary_contact.name}</p>
              <p className="text-xs text-muted-foreground truncate">{company.primary_contact.email}</p>
            </div>
          </div>
        </div>
      )}

      {!company.primary_contact && company.contacts_count === 0 && (
        <div className="border-t pt-3 mt-2">
          <p className="text-xs text-amber-600">{t("companies.noPrimaryContact")}</p>
        </div>
      )}
    </Card>
  );
}
