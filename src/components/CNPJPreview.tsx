import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CNPJData } from "./CNPJInput";

interface CNPJPreviewProps {
  data: CNPJData;
  onUseData: () => void;
  onFillManually: () => void;
}

export function CNPJPreview({ data, onUseData, onFillManually }: CNPJPreviewProps) {
  const { t } = useLanguage();
  
  const isActive = data.descricao_situacao_cadastral?.toUpperCase() === "ATIVA";
  
  const formatAddress = () => {
    const parts = [];
    if (data.logradouro) parts.push(data.logradouro);
    if (data.numero) parts.push(data.numero);
    if (data.complemento) parts.push(`- ${data.complemento}`);
    
    const line1 = parts.join(", ");
    
    const locationParts = [];
    if (data.bairro) locationParts.push(data.bairro);
    if (data.municipio && data.uf) locationParts.push(`${data.municipio}/${data.uf}`);
    else if (data.municipio) locationParts.push(data.municipio);
    
    const line2 = locationParts.join(" - ");
    
    return { line1, line2, cep: data.cep };
  };

  const address = formatAddress();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {t("cnpj.found")}
          </CardTitle>
          <Badge variant={isActive ? "default" : "destructive"} className="gap-1">
            {isActive ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {data.descricao_situacao_cadastral || t("cnpj.status")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{data.razao_social}</p>
              {data.nome_fantasia && (
                <p className="text-sm text-muted-foreground">
                  {t("cnpj.tradeName")}: {data.nome_fantasia}
                </p>
              )}
              {data.cnae_fiscal_descricao && (
                <p className="text-xs text-muted-foreground">
                  {t("cnpj.activity")}: {data.cnae_fiscal_descricao}
                </p>
              )}
            </div>
          </div>
        </div>

        {(address.line1 || address.line2) && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="space-y-0.5">
              {address.line1 && <p className="text-sm">{address.line1}</p>}
              {address.line2 && <p className="text-sm text-muted-foreground">{address.line2}</p>}
              {address.cep && (
                <p className="text-xs text-muted-foreground">CEP: {address.cep}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={onUseData} className="flex-1">
            {t("cnpj.useData")}
          </Button>
          <Button variant="outline" onClick={onFillManually} className="flex-1">
            {t("cnpj.fillManually")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
