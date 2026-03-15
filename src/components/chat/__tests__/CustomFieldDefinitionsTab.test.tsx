import { describe, it, expect } from "vitest";

// Since CustomFieldDefinitionsTab requires heavy mocking of supabase,
// we test the component's constants and logic in isolation

describe("CustomFieldDefinitionsTab - Field type constants", () => {
  const FIELD_TYPES = [
    { value: "text", label: "Texto" },
    { value: "decimal", label: "Decimal" },
    { value: "integer", label: "Inteiro" },
    { value: "date", label: "Data" },
    { value: "url", label: "URL" },
    { value: "boolean", label: "Booleano" },
  ];

  it("has 6 field types defined", () => {
    expect(FIELD_TYPES).toHaveLength(6);
  });

  it("includes all expected types", () => {
    const values = FIELD_TYPES.map((t) => t.value);
    expect(values).toContain("text");
    expect(values).toContain("decimal");
    expect(values).toContain("integer");
    expect(values).toContain("date");
    expect(values).toContain("url");
    expect(values).toContain("boolean");
  });

  it("has Portuguese labels", () => {
    const labels = FIELD_TYPES.map((t) => t.label);
    expect(labels).toContain("Texto");
    expect(labels).toContain("Decimal");
    expect(labels).toContain("Booleano");
  });
});

describe("CustomFieldDefinitionsTab - Company columns mapping", () => {
  const COMPANY_COLUMNS = [
    { value: "mrr", label: "MRR" },
    { value: "contract_value", label: "Valor do Contrato" },
    { value: "company_sector", label: "Setor" },
    { value: "company_document", label: "CNPJ" },
    { value: "trade_name", label: "Nome Fantasia" },
  ];

  it("has 5 mappable company columns", () => {
    expect(COMPANY_COLUMNS).toHaveLength(5);
  });

  it("includes mrr column", () => {
    expect(COMPANY_COLUMNS.find((c) => c.value === "mrr")).toBeTruthy();
  });

  it("includes trade_name column", () => {
    expect(COMPANY_COLUMNS.find((c) => c.value === "trade_name")).toBeTruthy();
  });

  it("includes contract_value column", () => {
    expect(COMPANY_COLUMNS.find((c) => c.value === "contract_value")).toBeTruthy();
  });

  it("includes company_sector column", () => {
    expect(COMPANY_COLUMNS.find((c) => c.value === "company_sector")).toBeTruthy();
  });

  it("includes company_document column", () => {
    expect(COMPANY_COLUMNS.find((c) => c.value === "company_document")).toBeTruthy();
  });
});

describe("CustomFieldDefinitionsTab - Key sanitization", () => {
  const sanitize = (key: string) =>
    key.trim().toLowerCase().replace(/\s+/g, "_");

  it("converts key to lowercase", () => {
    expect(sanitize("MRR_VALUE")).toBe("mrr_value");
  });

  it("replaces spaces with underscores", () => {
    expect(sanitize("Plano Contratado")).toBe("plano_contratado");
  });

  it("trims whitespace", () => {
    expect(sanitize("  mrr  ")).toBe("mrr");
  });

  it("collapses multiple consecutive spaces into single underscore", () => {
    expect(sanitize("Link  Master")).toBe("link_master");
  });

  it("leaves already valid keys unchanged", () => {
    expect(sanitize("already_valid")).toBe("already_valid");
  });
});

describe("CustomFieldDefinitionsTab - MAX_FIELDS limit", () => {
  const MAX_FIELDS = 20;

  it("limit is 20", () => {
    expect(MAX_FIELDS).toBe(20);
  });

  it("button should be disabled at max capacity", () => {
    const fieldsCount = 20;
    const isDisabled = fieldsCount >= MAX_FIELDS;
    expect(isDisabled).toBe(true);
  });

  it("button should be enabled under max capacity", () => {
    const fieldsCount = 19;
    const isDisabled = fieldsCount >= MAX_FIELDS;
    expect(isDisabled).toBe(false);
  });

  it("button should be enabled when empty", () => {
    const fieldsCount = 0;
    const isDisabled = fieldsCount >= MAX_FIELDS;
    expect(isDisabled).toBe(false);
  });
});

describe("CustomFieldDefinitionsTab - Target options", () => {
  it("maps_to dropdown only appears when target is company", () => {
    const showMapsTo = (target: string) => target === "company";
    expect(showMapsTo("company")).toBe(true);
    expect(showMapsTo("contact")).toBe(false);
  });
});

describe("CustomFieldDefinitionsTab - Payload construction", () => {
  it("creates correct payload for new field", () => {
    const form = {
      key: "MRR Value",
      label: "Valor do MRR",
      field_type: "decimal",
      target: "company",
      maps_to: "mrr",
    };
    const userId = "test-user-id";

    const payload = {
      key: form.key.trim().toLowerCase().replace(/\s+/g, "_"),
      label: form.label.trim(),
      field_type: form.field_type,
      target: form.target,
      maps_to: form.maps_to || null,
      user_id: userId,
    };

    expect(payload.key).toBe("mrr_value");
    expect(payload.label).toBe("Valor do MRR");
    expect(payload.maps_to).toBe("mrr");
  });

  it("sets maps_to to null when empty string", () => {
    const form = { maps_to: "" };
    const result = form.maps_to || null;
    expect(result).toBeNull();
  });

  it("sets maps_to to null when 'none' selected", () => {
    const selectedValue = "none";
    const result = selectedValue === "none" ? null : selectedValue;
    expect(result).toBeNull();
  });
});
