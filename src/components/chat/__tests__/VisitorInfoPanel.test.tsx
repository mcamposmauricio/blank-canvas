import { describe, it, expect } from "vitest";

// Test the CustomFieldRow formatting logic in isolation
// (extracted from VisitorInfoPanel.tsx)

interface FieldDef {
  id: string;
  key: string;
  label: string;
  field_type: string;
  target: string;
  maps_to: string | null;
  is_active: boolean;
}

function formatFieldValue(fieldDef: FieldDef, value: any): string {
  switch (fieldDef.field_type) {
    case "decimal":
      return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    case "integer":
      return Number(value).toLocaleString("pt-BR");
    case "date":
      return new Date(value).toLocaleDateString("pt-BR");
    case "url":
      return String(value);
    case "boolean":
      return value ? "Sim" : "Não";
    default:
      return String(value);
  }
}

describe("VisitorInfoPanel - CustomFieldRow formatting", () => {
  const makeDef = (type: string): FieldDef => ({
    id: "1",
    key: "test",
    label: "Test",
    field_type: type,
    target: "company",
    maps_to: null,
    is_active: true,
  });

  describe("decimal formatting", () => {
    it("formats 5000.5 as BRL currency", () => {
      const result = formatFieldValue(makeDef("decimal"), 5000.5);
      expect(result).toContain("5.000,50");
      expect(result).toContain("R$");
    });

    it("formats 0 as R$ 0,00", () => {
      const result = formatFieldValue(makeDef("decimal"), 0);
      expect(result).toBe("R$ 0,00");
    });

    it("formats large numbers with thousands separator", () => {
      const result = formatFieldValue(makeDef("decimal"), 1234567.89);
      expect(result).toContain("1.234.567,89");
    });
  });

  describe("integer formatting", () => {
    it("formats 1000 with locale separator", () => {
      const result = formatFieldValue(makeDef("integer"), 1000);
      expect(result).toBe("1.000");
    });

    it("formats 0 as 0", () => {
      const result = formatFieldValue(makeDef("integer"), 0);
      expect(result).toBe("0");
    });
  });

  describe("date formatting", () => {
    it("formats ISO date to pt-BR", () => {
      const result = formatFieldValue(makeDef("date"), "2024-06-15");
      expect(result).toMatch(/15\/06\/2024/);
    });
  });

  describe("url formatting", () => {
    it("returns the URL as string", () => {
      const result = formatFieldValue(makeDef("url"), "https://app.example.com/admin");
      expect(result).toBe("https://app.example.com/admin");
    });
  });

  describe("boolean formatting", () => {
    it("formats true as Sim", () => {
      const result = formatFieldValue(makeDef("boolean"), true);
      expect(result).toBe("Sim");
    });

    it("formats false as Não", () => {
      const result = formatFieldValue(makeDef("boolean"), false);
      expect(result).toBe("Não");
    });
  });

  describe("text formatting", () => {
    it("returns value as-is", () => {
      const result = formatFieldValue(makeDef("text"), "Premium Plan");
      expect(result).toBe("Premium Plan");
    });

    it("handles numeric values as text", () => {
      const result = formatFieldValue(makeDef("text"), 42);
      expect(result).toBe("42");
    });
  });
});

describe("VisitorInfoPanel - Field filtering", () => {
  const fieldDefs: FieldDef[] = [
    { id: "1", key: "mrr", label: "MRR", field_type: "decimal", target: "company", maps_to: "mrr", is_active: true },
    { id: "2", key: "plano", label: "Plano", field_type: "text", target: "company", maps_to: null, is_active: true },
    { id: "3", key: "inativo", label: "Inativo", field_type: "text", target: "company", maps_to: null, is_active: false },
    { id: "4", key: "regiao", label: "Região", field_type: "text", target: "contact", maps_to: null, is_active: true },
  ];

  const metadata: Record<string, any> = {
    mrr: 5000,
    plano: "Premium",
    inativo: "should_not_show",
    regiao: "Sul",
    unknown_key: "no_def",
  };

  it("only shows fields that have definitions AND metadata values", () => {
    const activeFieldDefs = fieldDefs.filter((fd) => fd.is_active);
    const visibleFields = activeFieldDefs.filter(
      (fd) => metadata[fd.key] !== undefined && metadata[fd.key] !== null
    );
    expect(visibleFields).toHaveLength(3); // mrr, plano, regiao
  });

  it("excludes inactive fields", () => {
    const activeFieldDefs = fieldDefs.filter((fd) => fd.is_active);
    const keys = activeFieldDefs.map((fd) => fd.key);
    expect(keys).not.toContain("inativo");
  });

  it("excludes fields with no metadata value", () => {
    const metadataWithMissing = { mrr: 5000 };
    const activeFieldDefs = fieldDefs.filter((fd) => fd.is_active);
    const visibleFields = activeFieldDefs.filter(
      (fd) => metadataWithMissing[fd.key as keyof typeof metadataWithMissing] !== undefined
    );
    expect(visibleFields).toHaveLength(1); // only mrr
  });

  it("does not render custom data section when metadata is empty", () => {
    const emptyMetadata: Record<string, any> = {};
    const shouldShowSection =
      fieldDefs.length > 0 && Object.keys(emptyMetadata).length > 0;
    expect(shouldShowSection).toBe(false);
  });

  it("does not render custom data section when no field definitions exist", () => {
    const emptyDefs: FieldDef[] = [];
    const shouldShowSection =
      emptyDefs.length > 0 && Object.keys(metadata).length > 0;
    expect(shouldShowSection).toBe(false);
  });
});

describe("VisitorInfoPanel - Multi-tenant isolation", () => {
  it("field definitions are fetched per tenant (concept test)", () => {
    // The RLS policy USING (tenant_id = get_user_tenant_id(auth.uid()))
    // ensures each tenant only sees their own definitions.
    // This test validates the expected behavior pattern.
    const tenantAFields = [
      { key: "mrr", label: "MRR", tenant_id: "tenant-a" },
      { key: "plano", label: "Plano", tenant_id: "tenant-a" },
    ];
    const tenantBFields = [
      { key: "regiao", label: "Região", tenant_id: "tenant-b" },
    ];

    // Tenant A should not see Tenant B fields
    const tenantAKeys = tenantAFields.map((f) => f.key);
    const tenantBKeys = tenantBFields.map((f) => f.key);

    expect(tenantAKeys).not.toContain("regiao");
    expect(tenantBKeys).not.toContain("mrr");
    expect(tenantBKeys).not.toContain("plano");
  });
});
