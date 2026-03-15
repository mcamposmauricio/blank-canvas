import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function validateApiKey(supabase: any, apiKey: string) {
  const keyPrefix = apiKey.substring(0, 12);

  const { data: apiKeyData } = await supabase
    .from("api_keys")
    .select("id, user_id, key_hash, is_active")
    .eq("key_prefix", keyPrefix)
    .eq("is_active", true)
    .maybeSingle();

  if (!apiKeyData) return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  if (keyHash !== apiKeyData.key_hash) return null;

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyData.id);

  return apiKeyData;
}

function matchRule(rule: any, contact: any): boolean {
  const cf = (contact?.custom_fields as Record<string, any>) || {};
  const rawVal = rule.field_source === "native" ? contact?.[rule.field_key] : cf[rule.field_key];
  if (rawVal === undefined || rawVal === null) return false;
  if (rule.operator === "equals") return String(rawVal).toLowerCase() === rule.field_value.toLowerCase();
  const numA = Number(rawVal);
  const numB = Number(rule.field_value);
  if (isNaN(numA) || isNaN(numB)) return false;
  switch (rule.operator) {
    case "greater_than": return numA > numB;
    case "less_than": return numA < numB;
    case "greater_or_equal": return numA >= numB;
    case "less_or_equal": return numA <= numB;
    default: return false;
  }
}

function buildBannerResult(banner: any, assignment: any) {
  return {
    assignment_id: assignment.id,
    content: banner.content,
    content_html: banner.content_html ?? null,
    text_align: banner.text_align ?? "center",
    bg_color: banner.bg_color ?? "#3B82F6",
    text_color: banner.text_color ?? "#FFFFFF",
    link_url: banner.link_url,
    link_label: banner.link_label,
    has_voting: banner.has_voting ?? false,
    banner_type: banner.banner_type ?? "info",
    priority: banner.priority ?? 5,
    vote: assignment.vote,
    position: banner.position ?? "top",
    auto_dismiss_seconds: banner.auto_dismiss_seconds ?? null,
    display_frequency: banner.display_frequency ?? "always",
    border_style: banner.border_style ?? "none",
    shadow_style: banner.shadow_style ?? "none",
    has_decorations: banner.has_decorations ?? false,
    outbound_type: banner.outbound_type ?? "banner",
    page_html: banner.page_html ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const visitorToken = url.searchParams.get("visitor_token");
    const apiKey = url.searchParams.get("api_key");
    const externalId = url.searchParams.get("external_id");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let contactId: string | null = null;
    let tenantId: string | null = null;

    // Path 1: api_key + external_id
    if (apiKey && externalId) {
      const apiKeyData = await validateApiKey(supabase, apiKey);
      if (!apiKeyData) {
        return new Response(JSON.stringify({ banners: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tenant_id")
        .eq("user_id", apiKeyData.user_id)
        .maybeSingle();
      tenantId = profile?.tenant_id ?? null;

      const { data: companyContact } = await supabase
        .from("company_contacts")
        .select("id, company_id")
        .eq("user_id", apiKeyData.user_id)
        .eq("external_id", externalId)
        .maybeSingle();

      if (companyContact) {
        contactId = companyContact.company_id;
      }
    }
    // Path 2: visitor_token
    else if (visitorToken) {
      const { data: visitor } = await supabase
        .from("chat_visitors")
        .select("contact_id, tenant_id")
        .eq("visitor_token", visitorToken)
        .maybeSingle();

      if (visitor?.contact_id) {
        contactId = visitor.contact_id;
        tenantId = visitor.tenant_id ?? null;
      }
    }

    const now = new Date().toISOString();

    // Build banner query with date/active filters
    let bannerQuery = supabase
      .from("chat_banners")
      .select("id, content, content_html, text_align, bg_color, text_color, link_url, link_label, has_voting, banner_type, priority, max_views, target_all, auto_assign_by_rules, position, auto_dismiss_seconds, display_frequency, border_style, shadow_style, has_decorations, outbound_type, page_html")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("priority", { ascending: false });

    if (tenantId) {
      bannerQuery = bannerQuery.eq("tenant_id", tenantId);
    }

    const { data: allBanners } = await bannerQuery;
    if (!allBanners || allBanners.length === 0) {
      return new Response(JSON.stringify({ banners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load field rules for all banners
    const bannerIds = allBanners.map((b: any) => b.id);
    const { data: allRules } = await supabase
      .from("chat_banner_field_rules")
      .select("banner_id, field_source, field_key, operator, field_value")
      .in("banner_id", bannerIds);

    const rulesByBanner: Record<string, any[]> = {};
    (allRules ?? []).forEach((r: any) => {
      if (!rulesByBanner[r.banner_id]) rulesByBanner[r.banner_id] = [];
      rulesByBanner[r.banner_id].push(r);
    });

    // Load contact data if we have rules to evaluate
    let contactData: any = null;
    if (contactId && Object.keys(rulesByBanner).length > 0) {
      const { data } = await supabase
        .from("contacts")
        .select("name, email, company_document, company_sector, city, state, external_id, service_priority, cs_status, mrr, contract_value, health_score, custom_fields")
        .eq("id", contactId)
        .maybeSingle();
      contactData = data;
    }

    // Filter banners by rules (AND logic)
    const filteredBanners = allBanners.filter((b: any) => {
      const rules = rulesByBanner[b.id];
      if (!rules || rules.length === 0) return true;
      if (!contactData) return false;
      return rules.every((r: any) => matchRule(r, contactData));
    });

    // Separate into auto-assign (target_all OR auto_assign_by_rules with passing rules) vs individual
    const autoAssignBanners = filteredBanners.filter((b: any) => {
      if (b.target_all) return true;
      if (b.auto_assign_by_rules) {
        const rules = rulesByBanner[b.id];
        // Only auto-assign if there are rules defined (otherwise it would be like target_all without intent)
        return rules && rules.length > 0;
      }
      return false;
    });
    const individualBanners = filteredBanners.filter((b: any) => !autoAssignBanners.includes(b));

    const result: any[] = [];

    // Process auto-assign banners in batch (O(3) queries instead of O(n×3))
    if (contactId && autoAssignBanners.length > 0) {
      const autoAssignIds = autoAssignBanners.map((b: any) => b.id);

      // 1. Batch fetch existing assignments
      const { data: existingAssignments } = await supabase
        .from("chat_banner_assignments")
        .select("id, banner_id, vote, views_count, dismissed_at")
        .eq("contact_id", contactId)
        .in("banner_id", autoAssignIds);

      const existingByBanner: Record<string, any> = {};
      (existingAssignments ?? []).forEach((a: any) => {
        existingByBanner[a.banner_id] = a;
      });

      // 2. Determine which assignments need to be created
      const toCreate: any[] = [];
      const validBanners: any[] = [];

      for (const banner of autoAssignBanners) {
        const existing = existingByBanner[banner.id];
        if (existing?.dismissed_at) continue;
        if (banner.max_views && existing && existing.views_count >= banner.max_views) continue;

        validBanners.push(banner);
        if (!existing) {
          toCreate.push({ banner_id: banner.id, contact_id: contactId, tenant_id: tenantId });
        }
      }

      // 3. Batch insert missing assignments
      if (toCreate.length > 0) {
        const { data: created } = await supabase
          .from("chat_banner_assignments")
          .insert(toCreate)
          .select("id, banner_id, vote, views_count");

        (created ?? []).forEach((a: any) => {
          existingByBanner[a.banner_id] = a;
        });
      }

      // 4. Build results and collect IDs for batch view update
      const viewUpdateIds: { id: string; newCount: number }[] = [];

      for (const banner of validBanners) {
        const assignment = existingByBanner[banner.id];
        if (!assignment) continue;

        result.push(buildBannerResult(banner, assignment));
        viewUpdateIds.push({ id: assignment.id, newCount: (assignment.views_count ?? 0) + 1 });
      }

      // 5. Batch update views (parallel individual updates — Supabase doesn't support batch update with different values)
      if (viewUpdateIds.length > 0) {
        await Promise.all(
          viewUpdateIds.map(({ id, newCount }) =>
            supabase.from("chat_banner_assignments").update({ views_count: newCount }).eq("id", id)
          )
        );
      }
    }

    // Process individually assigned banners (unchanged logic, already batch)
    if (contactId && individualBanners.length > 0) {
      const indivIds = individualBanners.map((b: any) => b.id);
      const { data: assignments } = await supabase
        .from("chat_banner_assignments")
        .select("id, vote, banner_id, views_count, dismissed_at")
        .eq("contact_id", contactId)
        .eq("is_active", true)
        .is("dismissed_at", null)
        .in("banner_id", indivIds);

      if (assignments) {
        const viewUpdates: { id: string; newCount: number }[] = [];

        for (const assignment of assignments) {
          const banner = individualBanners.find((b: any) => b.id === assignment.banner_id);
          if (!banner) continue;
          if (banner.max_views && assignment.views_count >= banner.max_views) continue;

          result.push(buildBannerResult(banner, assignment));
          viewUpdates.push({ id: assignment.id, newCount: (assignment.views_count ?? 0) + 1 });
        }

        if (viewUpdates.length > 0) {
          await Promise.all(
            viewUpdates.map(({ id, newCount }) =>
              supabase.from("chat_banner_assignments").update({ views_count: newCount }).eq("id", id)
            )
          );
        }
      }
    }

    // Sort by priority desc
    result.sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

    return new Response(JSON.stringify({ banners: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
