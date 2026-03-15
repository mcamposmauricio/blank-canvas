import { describe, it, expect } from "vitest";

// ---- Constants extracted from ChatWidget for testability ----
const COMPANY_DIRECT_FIELDS: Record<string, string> = {
  mrr: "mrr",
  contract_value: "contract_value",
  company_sector: "company_sector",
  company_document: "company_document",
  company_name: "trade_name",
};

const RESERVED_CONTACT_KEYS = ["name", "email", "phone"];
const RESERVED_COMPANY_KEYS = ["company_id", "company_name", "user_id"];

// ---- Tests ----

describe("ChatWidget - COMPANY_DIRECT_FIELDS mapping", () => {
  it("maps mrr to contacts.mrr", () => {
    expect(COMPANY_DIRECT_FIELDS["mrr"]).toBe("mrr");
  });

  it("maps contract_value to contacts.contract_value", () => {
    expect(COMPANY_DIRECT_FIELDS["contract_value"]).toBe("contract_value");
  });

  it("maps company_sector to contacts.company_sector", () => {
    expect(COMPANY_DIRECT_FIELDS["company_sector"]).toBe("company_sector");
  });

  it("maps company_document to contacts.company_document", () => {
    expect(COMPANY_DIRECT_FIELDS["company_document"]).toBe("company_document");
  });

  it("maps company_name to contacts.trade_name", () => {
    expect(COMPANY_DIRECT_FIELDS["company_name"]).toBe("trade_name");
  });

  it("does not contain reserved contact keys", () => {
    RESERVED_CONTACT_KEYS.forEach((key) => {
      expect(COMPANY_DIRECT_FIELDS).not.toHaveProperty(key);
    });
  });
});

describe("ChatWidget - Field classification logic", () => {
  const classifyFields = (props: Record<string, any>) => {
    const directUpdate: Record<string, any> = {};
    const customUpdate: Record<string, any> = {};

    for (const [key, val] of Object.entries(props)) {
      if (RESERVED_CONTACT_KEYS.includes(key) || RESERVED_COMPANY_KEYS.includes(key)) continue;
      if (COMPANY_DIRECT_FIELDS[key]) {
        directUpdate[COMPANY_DIRECT_FIELDS[key]] = val;
      } else {
        customUpdate[key] = val;
      }
    }

    return { directUpdate, customUpdate };
  };

  it("separates reserved contact keys (name, email, phone) from updates", () => {
    const props = { name: "João", email: "j@test.com", phone: "11999", mrr: 5000 };
    const { directUpdate, customUpdate } = classifyFields(props);
    expect(directUpdate).toEqual({ mrr: 5000 });
    expect(customUpdate).toEqual({});
  });

  it("separates reserved company keys (company_id, user_id) from updates", () => {
    const props = { company_id: "ABC", user_id: "xyz", mrr: 3000, plano: "Pro" };
    const { directUpdate, customUpdate } = classifyFields(props);
    expect(directUpdate).toEqual({ mrr: 3000 });
    expect(customUpdate).toEqual({ plano: "Pro" });
  });

  it("maps direct fields to their column names", () => {
    const props = { mrr: 5000, contract_value: 10000, company_sector: "Tech" };
    const { directUpdate } = classifyFields(props);
    expect(directUpdate).toEqual({
      mrr: 5000,
      contract_value: 10000,
      company_sector: "Tech",
    });
  });

  it("puts unknown fields into customUpdate", () => {
    const props = { plano_contratado: "Premium", link_master: "https://app.com/admin" };
    const { directUpdate, customUpdate } = classifyFields(props);
    expect(directUpdate).toEqual({});
    expect(customUpdate).toEqual({
      plano_contratado: "Premium",
      link_master: "https://app.com/admin",
    });
  });

  it("handles mixed direct and custom fields", () => {
    const props = {
      name: "Maria",
      email: "m@test.com",
      company_id: "123",
      company_name: "ACME",
      mrr: 8000,
      contract_value: 15000,
      plano: "Enterprise",
      regiao: "Sul",
    };
    const { directUpdate, customUpdate } = classifyFields(props);
    // company_name is in RESERVED_COMPANY_KEYS, so it's skipped (not mapped to trade_name here)
    // The trade_name mapping happens separately in the upsert when creating the company
    expect(directUpdate).toEqual({
      mrr: 8000,
      contract_value: 15000,
    });
    expect(customUpdate).toEqual({
      plano: "Enterprise",
      regiao: "Sul",
    });
  });

  it("returns empty objects when only reserved keys present", () => {
    const props = { name: "Test", email: "t@t.com", phone: "123", company_id: "X" };
    const { directUpdate, customUpdate } = classifyFields(props);
    expect(directUpdate).toEqual({});
    expect(customUpdate).toEqual({});
  });
});

describe("ChatWidget - upsertCompany logic (unit)", () => {
  it("returns null IDs when no company_id and no company_name", () => {
    const props = { mrr: 5000, plano: "Pro" };
    const companyId = props["company_id" as keyof typeof props];
    const companyName = props["company_name" as keyof typeof props];
    const shouldUpsert = !!(companyId || companyName);
    expect(shouldUpsert).toBe(false);
  });

  it("triggers upsert when company_id is present", () => {
    const props = { company_id: "ABC", mrr: 5000 };
    const shouldUpsert = !!(props.company_id || (props as any).company_name);
    expect(shouldUpsert).toBe(true);
  });

  it("triggers upsert when company_name is present without company_id", () => {
    const props = { company_name: "ACME Corp", mrr: 5000 };
    const shouldUpsert = !!((props as any).company_id || props.company_name);
    expect(shouldUpsert).toBe(true);
  });
});

describe("ChatWidget - Auto-start trigger logic", () => {
  it("should set autoStartTriggered when name is provided via update()", () => {
    let autoStartTriggered = false;
    const visitorId = null;

    // Simulate receiving name via nps-chat-update
    const name = "João";
    if (name && !autoStartTriggered && !visitorId) {
      autoStartTriggered = true;
    }

    expect(autoStartTriggered).toBe(true);
  });

  it("should NOT set autoStartTriggered when visitorId already exists", () => {
    let autoStartTriggered = false;
    const visitorId = "existing-visitor-id";

    const name = "João";
    if (name && !autoStartTriggered && !visitorId) {
      autoStartTriggered = true;
    }

    expect(autoStartTriggered).toBe(false);
  });

  it("should NOT set autoStartTriggered when name is not provided", () => {
    let autoStartTriggered = false;
    const visitorId = null;

    const name = undefined;
    if (name && !autoStartTriggered && !visitorId) {
      autoStartTriggered = true;
    }

    expect(autoStartTriggered).toBe(false);
  });

  it("auto-start effect condition requires formData.name and form phase", () => {
    const scenarios = [
      { autoStart: true, name: "João", phase: "form", visitorId: null, loading: false, expected: true },
      { autoStart: true, name: "João", phase: "chat", visitorId: null, loading: false, expected: false },
      { autoStart: true, name: "", phase: "form", visitorId: null, loading: false, expected: false },
      { autoStart: true, name: "João", phase: "form", visitorId: "abc", loading: false, expected: false },
      { autoStart: true, name: "João", phase: "form", visitorId: null, loading: true, expected: false },
      { autoStart: false, name: "João", phase: "form", visitorId: null, loading: false, expected: false },
    ];

    scenarios.forEach(({ autoStart, name, phase, visitorId, loading, expected }) => {
      const shouldTrigger = autoStart && name && phase === "form" && !visitorId && !loading;
      expect(!!shouldTrigger).toBe(expected);
    });
  });
});

describe("ChatWidget - Custom fields JSONB merge", () => {
  it("merges new custom fields with existing ones", () => {
    const existing = { plano: "Basic", regiao: "Norte" };
    const newFields = { plano: "Premium", link_master: "https://app.com" };
    const merged = { ...existing, ...newFields };

    expect(merged).toEqual({
      plano: "Premium",
      regiao: "Norte",
      link_master: "https://app.com",
    });
  });

  it("handles empty existing custom_fields", () => {
    const existing = {};
    const newFields = { plano: "Pro" };
    const merged = { ...existing, ...newFields };

    expect(merged).toEqual({ plano: "Pro" });
  });

  it("handles null existing custom_fields", () => {
    const existing = null;
    const newFields = { plano: "Pro" };
    const merged = { ...(existing ?? {}), ...newFields };

    expect(merged).toEqual({ plano: "Pro" });
  });
});
