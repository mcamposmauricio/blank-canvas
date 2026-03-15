import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Helper: Check if value is empty (should not overwrite existing data) ---
function isEmptyValue(val: any): boolean {
  if (val === null || val === undefined || val === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0) return true;
  return false;
}

// --- Helper: Filter out empty values from an object ---
function filterNonEmpty(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (!isEmptyValue(val)) result[key] = val;
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { api_key, external_id, name, email, phone, company_id, company_name, custom_data, visitor_token } = body;

    console.log("[resolve-chat-visitor] Payload received:", { external_id, name, email, company_id, company_name, has_custom_data: !!custom_data, custom_data_values: custom_data || {} });

    if (!api_key) {
      return new Response(
        JSON.stringify({ error: "api_key is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Validate API key ---
    const keyPrefix = api_key.substring(0, 12);

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from("api_keys")
      .select("id, user_id, key_hash, is_active, tenant_id")
      .eq("key_prefix", keyPrefix)
      .eq("is_active", true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ visitor_token: null, error: "invalid_api_key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(api_key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (keyHash !== apiKeyData.key_hash) {
      return new Response(
        JSON.stringify({ visitor_token: null, error: "invalid_api_key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = apiKeyData.user_id;

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKeyData.id);

    // Get tenant_id - prefer from api_keys table, fallback to user_profiles
    let tenantId = apiKeyData.tenant_id || null;
    if (!tenantId) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tenant_id")
        .eq("user_id", userId)
        .maybeSingle();
      tenantId = profile?.tenant_id || null;
    }

  // Get field definitions for maps_to resolution (load early for all branches)
    let fieldDefs: any[] = [];
    if (tenantId && custom_data && Object.keys(custom_data).length > 0) {
      const { data: defs } = await supabase
        .from("chat_custom_field_definitions")
        .select("key, maps_to, field_type")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);
      fieldDefs = defs || [];
    }

    // If no external_id provided, just return the user_id (owner resolution only)
    // Also handle name+email without external_id
    if (!external_id) {
      if (name && email) {
        // Try to find existing company_contact by email using tenant_id
        const ccQuery = supabase
          .from("company_contacts")
          .select("id, company_id, name, email")
          .eq("email", email);

        // Use tenant_id for lookup if available, fallback to user_id
        if (tenantId) {
          ccQuery.eq("tenant_id", tenantId);
        } else {
          ccQuery.eq("user_id", userId);
        }

        const { data: existingCC } = await ccQuery.maybeSingle();

        if (existingCC) {
          // Upsert company if company_id/company_name provided
          let contactId = existingCC.company_id;
          if (company_id || company_name) {
            contactId = await upsertCompany(supabase, {
              userId, tenantId, companyId: company_id, companyName: company_name,
              contactId, customData: custom_data, fieldDefs,
            });
            // Link company_contact to company if not linked
            if (contactId && !existingCC.company_id) {
              await supabase
                .from("company_contacts")
                .update({ company_id: contactId, updated_at: new Date().toISOString() })
                .eq("id", existingCC.id);
            }
          } else if (custom_data && Object.keys(custom_data).length > 0 && contactId) {
            // Apply custom_data to existing company
            await applyCustomData(supabase, contactId, custom_data, fieldDefs);
          } else if (contactId) {
            // Always check category rules even without new custom_data
            await applyCategoryFieldRules(supabase, contactId, {});
          }

          // Find or create visitor linked to this contact
          const visitorResult = await findOrCreateVisitor(supabase, {
            companyContactId: existingCC.id,
            contactId: contactId,
            name, email, phone, userId, tenantId, customData: custom_data,
          });

          return new Response(
            JSON.stringify({
              visitor_token: visitorResult.visitor_token,
              visitor_name: name,
              visitor_email: email,
              contact_id: contactId,
              company_contact_id: existingCC.id,
              user_id: userId,
              auto_start: true,
              has_history: visitorResult.has_history,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // No existing contact — return auto_start but no IDs (will be created on room creation)
        return new Response(
          JSON.stringify({
            visitor_token: null,
            user_id: userId,
            auto_start: false,
            needs_form: false,
            has_name_email: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // --- visitor_token fallback: identify by token when name/email absent ---
      if (visitor_token) {
        const { data: tokenVisitor } = await supabase
          .from("chat_visitors")
          .select("id, visitor_token, contact_id, company_contact_id, name, email")
          .eq("visitor_token", visitor_token)
          .maybeSingle();

        if (tokenVisitor) {
          // Load field defs if not loaded yet (custom_data present but no tenantId check earlier)
          if (fieldDefs.length === 0 && tenantId && custom_data && Object.keys(custom_data).length > 0) {
            const { data: defs } = await supabase
              .from("chat_custom_field_definitions")
              .select("key, maps_to")
              .eq("tenant_id", tenantId)
              .eq("is_active", true);
            fieldDefs = defs || [];
          }

          let contactId = tokenVisitor.contact_id;

          // Upsert company if needed
          if (company_id || company_name) {
            contactId = await upsertCompany(supabase, {
              userId, tenantId, companyId: company_id, companyName: company_name,
              contactId, customData: custom_data, fieldDefs,
            });
          } else if (custom_data && Object.keys(custom_data).length > 0 && contactId) {
            await applyCustomData(supabase, contactId, custom_data, fieldDefs);
          } else if (contactId) {
            await applyCategoryFieldRules(supabase, contactId, {});
          }

          // Update visitor metadata if custom_data has non-empty values
          if (custom_data && Object.keys(custom_data).length > 0) {
            const nonEmptyMeta = filterNonEmpty(custom_data);
            if (Object.keys(nonEmptyMeta).length > 0) {
              await supabase
                .from("chat_visitors")
                .update({ metadata: nonEmptyMeta })
                .eq("id", tokenVisitor.id);
            }
          }

          // Check history
          const { count } = await supabase
            .from("chat_rooms")
            .select("id", { count: "exact", head: true })
            .eq("visitor_id", tokenVisitor.id);

          return new Response(
            JSON.stringify({
              visitor_token: tokenVisitor.visitor_token,
              visitor_name: tokenVisitor.name,
              visitor_email: tokenVisitor.email,
              contact_id: contactId,
              company_contact_id: tokenVisitor.company_contact_id,
              user_id: userId,
              auto_start: true,
              has_history: (count || 0) > 0,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ visitor_token: null, user_id: userId, needs_form: !name || !email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- external_id provided ---

    // Find company_contact by external_id + tenant_id (fallback to user_id)
    const ccExtQuery = supabase
      .from("company_contacts")
      .select("id, name, email, phone, company_id")
      .eq("external_id", external_id);

    if (tenantId) {
      ccExtQuery.eq("tenant_id", tenantId);
    } else {
      ccExtQuery.eq("user_id", userId);
    }

    const { data: companyContact } = await ccExtQuery.maybeSingle();

    if (companyContact) {
      // UPSERT: update contact fields if different AND non-empty
      const ccUpdates: Record<string, any> = {};
      if (name && name !== companyContact.name) ccUpdates.name = name;
      if (email && email !== companyContact.email) ccUpdates.email = email;
      if (phone && phone !== companyContact.phone) ccUpdates.phone = phone;

      if (Object.keys(ccUpdates).length > 0) {
        await supabase
          .from("company_contacts")
          .update({ ...ccUpdates, updated_at: new Date().toISOString() })
          .eq("id", companyContact.id);
      }

      // Upsert company (contacts table) if company_id or company_name
      let contactId = companyContact.company_id;
      if (company_id || company_name) {
        contactId = await upsertCompany(supabase, {
          userId, tenantId, companyId: company_id, companyName: company_name,
          contactId, customData: custom_data, fieldDefs,
        });
      } else if (custom_data && contactId) {
        // Even without company_id/name, update custom_data on existing company
        await applyCustomData(supabase, contactId, custom_data, fieldDefs);
      } else if (contactId) {
        // Always check category rules even without new custom_data
        await applyCategoryFieldRules(supabase, contactId, {});
      }

      // Find or create visitor
      const visitorResult = await findOrCreateVisitor(supabase, {
        companyContactId: companyContact.id,
        contactId,
        name: name || companyContact.name,
        email: email || companyContact.email,
        phone: phone || companyContact.phone,
        userId,
        tenantId,
        customData: custom_data,
      });

      return new Response(
        JSON.stringify({
          visitor_token: visitorResult.visitor_token,
          visitor_name: name || companyContact.name,
          visitor_email: email || companyContact.email,
          contact_id: contactId,
          company_contact_id: companyContact.id,
          user_id: userId,
          auto_start: true,
          has_history: visitorResult.has_history,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- external_id NOT found in company_contacts ---

    if (name && email) {
      // Create company if needed
      let contactId: string | null = null;
      if (company_id || company_name) {
        contactId = await upsertCompany(supabase, {
          userId, tenantId, companyId: company_id, companyName: company_name,
          contactId: null, customData: custom_data, fieldDefs,
        });
      }

      // Create company_contact with tenant_id
      const { data: newCC } = await supabase
        .from("company_contacts")
        .insert({
          company_id: contactId || undefined,
          name,
          email,
          phone: phone || null,
          external_id,
          user_id: userId,
          tenant_id: tenantId,
        } as any)
        .select("id, company_id")
        .single();

      if (!newCC) {
        return new Response(
          JSON.stringify({ error: "failed_to_create_contact", user_id: userId, needs_form: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      const finalContactId = newCC.company_id || contactId;

      // Create visitor
      const visitorResult = await findOrCreateVisitor(supabase, {
        companyContactId: newCC.id,
        contactId: finalContactId,
        name, email, phone, userId, tenantId, customData: custom_data,
      });

      // Sync bidirectional link
      if (visitorResult.visitor_id) {
        await supabase
          .from("company_contacts")
          .update({ chat_visitor_id: visitorResult.visitor_id })
          .eq("id", newCC.id);
      }

      return new Response(
        JSON.stringify({
          visitor_token: visitorResult.visitor_token,
          visitor_name: name,
          visitor_email: email,
          contact_id: finalContactId,
          company_contact_id: newCC.id,
          user_id: userId,
          auto_start: true,
          has_history: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // external_id provided but no name+email — need form
    return new Response(
      JSON.stringify({
        visitor_token: null,
        user_id: userId,
        needs_form: true,
        auto_start: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in resolve-chat-visitor:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// --- Helper: Find or create chat_visitor linked to company_contact ---
async function findOrCreateVisitor(
  supabase: any,
  opts: {
    companyContactId: string;
    contactId: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    userId: string;
    tenantId?: string | null;
    customData?: Record<string, any>;
  }
) {
  const { companyContactId, contactId, name, email, phone, userId, tenantId, customData } = opts;

  // Check existing visitor
  const { data: existing } = await supabase
    .from("chat_visitors")
    .select("id, visitor_token, name, email")
    .eq("company_contact_id", companyContactId)
    .maybeSingle();

  if (existing) {
    // Update visitor with latest data — only non-empty values
    const updates: Record<string, any> = {};
    if (name && name !== existing.name) updates.name = name;
    if (email && email !== existing.email) updates.email = email;
    if (!isEmptyValue(phone)) updates.phone = phone;
    if (customData && Object.keys(customData).length > 0) {
      const nonEmptyMeta = filterNonEmpty(customData);
      if (Object.keys(nonEmptyMeta).length > 0) {
        // MERGE metadata instead of replacing — fetch existing first
        const { data: currentVisitor } = await supabase
          .from("chat_visitors")
          .select("metadata")
          .eq("id", existing.id)
          .single();
        const existingMeta = (currentVisitor?.metadata as Record<string, any>) ?? {};
        const merged = { ...existingMeta };
        for (const [k, v] of Object.entries(nonEmptyMeta)) {
          if (!isEmptyValue(v)) merged[k] = v;
        }
        updates.metadata = merged;
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("chat_visitors")
        .update(updates)
        .eq("id", existing.id);
    }

    // Check history
    const { count } = await supabase
      .from("chat_rooms")
      .select("id", { count: "exact", head: true })
      .eq("visitor_id", existing.id);

    return {
      visitor_id: existing.id,
      visitor_token: existing.visitor_token,
      has_history: (count || 0) > 0,
    };
  }

  // Create new visitor with tenant_id
  const nonEmptyMeta = customData ? filterNonEmpty(customData) : {};
  const { data: newVisitor } = await supabase
    .from("chat_visitors")
    .insert({
      name,
      email: email || null,
      phone: phone || null,
      owner_user_id: userId,
      company_contact_id: companyContactId,
      contact_id: contactId,
      tenant_id: tenantId,
      ...(Object.keys(nonEmptyMeta).length > 0 ? { metadata: nonEmptyMeta } : {}),
    })
    .select("id, visitor_token")
    .single();

  if (newVisitor) {
    // Sync bidirectional link
    await supabase
      .from("company_contacts")
      .update({ chat_visitor_id: newVisitor.id })
      .eq("id", companyContactId);
  }

  return {
    visitor_id: newVisitor?.id || null,
    visitor_token: newVisitor?.visitor_token || null,
    has_history: false,
  };
}

// --- Helper: Upsert company (contacts table) ---
async function upsertCompany(
  supabase: any,
  opts: {
    userId: string;
    tenantId?: string | null;
    companyId?: string;
    companyName?: string;
    contactId: string | null;
    customData?: Record<string, any>;
    fieldDefs: any[];
  }
): Promise<string | null> {
  const { userId, tenantId, companyId, companyName, contactId, customData, fieldDefs } = opts;

  let finalContactId = contactId;

  // Try to find by external_id using tenant_id
  if (companyId && !finalContactId) {
    const findQuery = supabase
      .from("contacts")
      .select("id")
      .eq("external_id", String(companyId))
      .eq("is_company", true);

    if (tenantId) {
      findQuery.eq("tenant_id", tenantId);
    } else {
      findQuery.eq("user_id", userId);
    }

    const { data: existing } = await findQuery.maybeSingle();
    if (existing) finalContactId = existing.id;
  }

  // Create if not found
  if (!finalContactId) {
    const { data: newCompany } = await supabase
      .from("contacts")
      .insert({
        name: companyName || `Empresa ${companyId}`,
        trade_name: companyName || null,
        external_id: companyId ? String(companyId) : null,
        is_company: true,
        user_id: userId,
        tenant_id: tenantId,
      })
      .select("id")
      .single();

    if (newCompany) finalContactId = newCompany.id;
  } else if (companyName) {
    // Update name if provided
    await supabase
      .from("contacts")
      .update({ name: companyName, trade_name: companyName, updated_at: new Date().toISOString() })
      .eq("id", finalContactId);
  }

  // Apply custom data and/or category rules
  if (finalContactId && customData) {
    await applyCustomData(supabase, finalContactId, customData, fieldDefs);
  } else if (finalContactId) {
    // Always check category rules even without new custom_data
    await applyCategoryFieldRules(supabase, finalContactId, {});
  }

  return finalContactId;
}

// --- Helper: Apply custom_data using maps_to definitions ---
// Only persists non-empty values — empty values are silently ignored to prevent overwriting existing data
async function applyCustomData(
  supabase: any,
  contactId: string,
  customData: Record<string, any>,
  fieldDefs: any[]
) {
  const mapsToLookup: Record<string, string> = {};
  for (const def of fieldDefs) {
    if (def.maps_to) mapsToLookup[def.key] = def.maps_to;
  }

  const directUpdate: Record<string, any> = {};
  const customUpdate: Record<string, any> = {};

  // Known direct column mappings (fallback if no field definition)
  const KNOWN_DIRECT: Record<string, string> = {
    mrr: "mrr",
    contract_value: "contract_value",
    company_sector: "company_sector",
    company_document: "company_document",
    health_score: "health_score",
  };

  for (const [key, val] of Object.entries(customData)) {
    // Skip reserved keys
    if (["name", "email", "phone", "company_id", "company_name"].includes(key)) continue;

    // Skip empty values — never overwrite existing data with nothing
    if (isEmptyValue(val)) continue;

    const mapsTo = mapsToLookup[key] || KNOWN_DIRECT[key];
    if (mapsTo) {
      directUpdate[mapsTo] = val;
    } else {
      customUpdate[key] = val;
    }
  }

  // Collect keys that were moved to direct columns (to clean from custom_fields)
  const keysMovedToDirect: string[] = [];
  for (const [key] of Object.entries(customData)) {
    if (mapsToLookup[key] || KNOWN_DIRECT[key]) keysMovedToDirect.push(key);
  }

  // --- Zero-downgrade protection for direct columns ---
  if (Object.keys(directUpdate).length > 0) {
    // Fetch current values to prevent overwriting real data with zeros
    const directCols = Object.keys(directUpdate).filter(k => k !== "updated_at");
    const { data: currentContact } = await supabase
      .from("contacts")
      .select(directCols.join(","))
      .eq("id", contactId)
      .single();

    if (currentContact) {
      for (const col of directCols) {
        const currentVal = currentContact[col];
        const newVal = directUpdate[col];
        // If current value is non-zero/non-null and new value is 0, skip (prevent downgrade)
        if (currentVal !== null && currentVal !== undefined && currentVal !== 0 && newVal === 0) {
          console.log(`[applyCustomData] SKIP zero-downgrade for ${col}: current=${currentVal}, incoming=0`);
          delete directUpdate[col];
        }
      }
    }

    // Only update if there are still columns to update
    if (Object.keys(directUpdate).length > 0) {
      directUpdate.updated_at = new Date().toISOString();
      console.log(`[applyCustomData] Direct update for contact ${contactId}:`, directUpdate);
      await supabase.from("contacts").update(directUpdate).eq("id", contactId);
    }
  }

  // --- Build field type lookup for numeric zero-protection in custom_fields ---
  const fieldTypeLookup: Record<string, string> = {};
  for (const def of fieldDefs) {
    fieldTypeLookup[def.key] = def.field_type;
  }

  // Always fetch custom_fields to clean stale keys that now live in direct columns
  if (Object.keys(customUpdate).length > 0 || keysMovedToDirect.length > 0) {
    const { data: current } = await supabase
      .from("contacts")
      .select("custom_fields")
      .eq("id", contactId)
      .single();

    const existing = (current?.custom_fields as Record<string, any>) ?? {};
    const merged = { ...existing };

    // Add new custom values with zero-downgrade protection for numeric fields
    for (const [k, v] of Object.entries(customUpdate)) {
      if (isEmptyValue(v)) continue;
      const fType = fieldTypeLookup[k] || "";
      const isNumeric = ["integer", "decimal", "number"].includes(fType);
      if (isNumeric && v === 0 && merged[k] !== undefined && merged[k] !== null && merged[k] !== 0) {
        console.log(`[applyCustomData] SKIP custom zero-downgrade for ${k}: current=${merged[k]}, incoming=0`);
        continue;
      }
      merged[k] = v;
    }

    // Remove stale keys that now live in direct columns
    for (const k of keysMovedToDirect) {
      delete merged[k];
    }

    console.log(`[applyCustomData] Custom fields update for contact ${contactId}:`, { customUpdate, keysMovedToDirect, merged });
    await supabase
      .from("contacts")
      .update({ custom_fields: merged, updated_at: new Date().toISOString() })
      .eq("id", contactId);
  }

  // --- Auto-categorize based on field rules ---
  await applyCategoryFieldRules(supabase, contactId, customData);
}

// --- Helper: Check category field rules and auto-assign service_category_id ---
async function applyCategoryFieldRules(
  supabase: any,
  contactId: string,
  customData: Record<string, any>
) {
  // Get tenant from contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("tenant_id, custom_fields")
    .eq("id", contactId)
    .single();

  if (!contact?.tenant_id) return;

  const { data: rules } = await supabase
    .from("chat_category_field_rules")
    .select("category_id, field_key, field_value, field_source, operator")
    .eq("tenant_id", contact.tenant_id);

  if (!rules || rules.length === 0) return;

  // Fetch full contact for native field access
  const { data: fullContact } = await supabase
    .from("contacts")
    .select("name, email, company_document, company_sector, city, state, external_id, service_priority, cs_status, mrr, contract_value, health_score")
    .eq("id", contactId)
    .single();

  const cf = { ...(contact.custom_fields || {}), ...customData };

  for (const rule of rules) {
    const rawVal = rule.field_source === "native"
      ? fullContact?.[rule.field_key]
      : cf[rule.field_key];

    if (rawVal === undefined || rawVal === null) continue;

    if (matchRuleValue(rawVal, rule.field_value, rule.operator)) {
      console.log(`[applyCategoryFieldRules] Match: ${rule.field_source}.${rule.field_key} ${rule.operator} ${rule.field_value} → category ${rule.category_id}`);
      await supabase
        .from("contacts")
        .update({ service_category_id: rule.category_id, updated_at: new Date().toISOString() })
        .eq("id", contactId);
      return; // First match wins
    }
  }
}

function matchRuleValue(rawVal: any, ruleValue: string, operator: string): boolean {
  if (!operator || operator === "equals") {
    return String(rawVal) === ruleValue;
  }
  const numA = Number(rawVal);
  const numB = Number(ruleValue);
  if (isNaN(numA) || isNaN(numB)) return false;
  switch (operator) {
    case "greater_than": return numA > numB;
    case "less_than": return numA < numB;
    case "greater_or_equal": return numA >= numB;
    case "less_or_equal": return numA <= numB;
    default: return String(rawVal) === ruleValue;
  }
}
