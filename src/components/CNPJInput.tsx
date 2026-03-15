import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cnae_fiscal_descricao: string;
  descricao_situacao_cadastral: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

interface CNPJInputProps {
  value: string;
  onChange: (value: string) => void;
  onDataFetched?: (data: CNPJData | null) => void;
  disabled?: boolean;
}

const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

const validateCNPJ = (cnpj: string): boolean => {
  const numbers = cnpj.replace(/\D/g, "");
  if (numbers.length !== 14) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validate first digit
  let sum = 0;
  let weight = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weight[i];
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(numbers[12]) !== digit1) return false;
  
  // Validate second digit
  sum = 0;
  weight = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weight[i];
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(numbers[13]) !== digit2) return false;
  
  return true;
};

export function CNPJInput({ value, onChange, onDataFetched, disabled }: CNPJInputProps) {
  const { t } = useLanguage();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCNPJData = useCallback(async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    
    if (!validateCNPJ(cleanCNPJ)) {
      setError(t("cnpj.invalid"));
      onDataFetched?.(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(t("cnpj.notFound"));
        } else {
          setError(t("cnpj.error"));
        }
        onDataFetched?.(null);
        return;
      }

      const data = await response.json();
      onDataFetched?.({
        cnpj: data.cnpj,
        razao_social: data.razao_social || "",
        nome_fantasia: data.nome_fantasia || "",
        cnae_fiscal_descricao: data.cnae_fiscal_descricao || "",
        descricao_situacao_cadastral: data.descricao_situacao_cadastral || "",
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        municipio: data.municipio || "",
        uf: data.uf || "",
        cep: data.cep || "",
      });
    } catch (err) {
      setError(t("cnpj.error"));
      onDataFetched?.(null);
    } finally {
      setIsSearching(false);
    }
  }, [onDataFetched, t]);

  useEffect(() => {
    const cleanValue = value.replace(/\D/g, "");
    
    if (cleanValue.length === 14) {
      const timer = setTimeout(() => {
        fetchCNPJData(cleanValue);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setError(null);
      onDataFetched?.(null);
    }
  }, [value, fetchCNPJData, onDataFetched]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    if (formatted.replace(/\D/g, "").length <= 14) {
      onChange(formatted);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="cnpj">{t("contacts.companyDocument")}</Label>
      <div className="relative">
        <Input
          id="cnpj"
          value={value}
          onChange={handleChange}
          placeholder="00.000.000/0000-00"
          disabled={disabled || isSearching}
          className={error ? "border-destructive" : ""}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {isSearching && (
        <p className="text-sm text-muted-foreground">{t("cnpj.searching")}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
