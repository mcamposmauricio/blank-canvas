import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const api_key = url.searchParams.get("api_key");

    if (!api_key) {
      return new Response(
        JSON.stringify({ error: "api_key is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate API key
    const keyPrefix = api_key.substring(0, 12);

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from("api_keys")
      .select("id, user_id, key_hash, is_active")
      .eq("key_prefix", keyPrefix)
      .eq("is_active", true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: "invalid_api_key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verify full key hash (SHA-256)
    const encoder = new TextEncoder();
    const data = encoder.encode(api_key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (keyHash !== apiKeyData.key_hash) {
      return new Response(
        JSON.stringify({ error: "invalid_api_key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = apiKeyData.user_id;

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKeyData.id);

    // Get tenant_id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id || null;

    // Fetch active custom field definitions
    let fields: any[] = [];
    if (tenantId) {
      const { data: fieldDefs } = await supabase
        .from("chat_custom_field_definitions")
        .select("key, label, field_type, target, maps_to, display_order")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      fields = fieldDefs || [];
    }

    // Fetch chat settings
    const { data: chatSettings } = await supabase
      .from("chat_settings")
      .select("show_email_field, show_phone_field, form_intro_text, widget_company_name, show_chat_history, show_csat, allow_file_attachments, allow_multiple_chats, show_outside_hours_banner, outside_hours_title, outside_hours_message, show_all_busy_banner, all_busy_title, all_busy_message, waiting_message")
      .eq("user_id", userId)
      .maybeSingle();

    // Fetch brand settings for primary color
    const { data: brandSettings } = await supabase
      .from("brand_settings")
      .select("primary_color, company_name")
      .eq("user_id", userId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        tenant_id: tenantId,
        owner_user_id: userId,
        fields,
        settings: {
          show_email_field: chatSettings?.show_email_field ?? true,
          show_phone_field: chatSettings?.show_phone_field ?? true,
          form_intro_text: chatSettings?.form_intro_text || null,
          company_name: chatSettings?.widget_company_name || brandSettings?.company_name || null,
          show_chat_history: chatSettings?.show_chat_history ?? true,
          show_csat: chatSettings?.show_csat ?? true,
          allow_file_attachments: chatSettings?.allow_file_attachments ?? true,
          allow_multiple_chats: chatSettings?.allow_multiple_chats ?? false,
          show_outside_hours_banner: chatSettings?.show_outside_hours_banner ?? true,
          outside_hours_title: chatSettings?.outside_hours_title || null,
          outside_hours_message: chatSettings?.outside_hours_message || null,
          show_all_busy_banner: chatSettings?.show_all_busy_banner ?? true,
          all_busy_title: chatSettings?.all_busy_title || null,
          all_busy_message: chatSettings?.all_busy_message || null,
          waiting_message: chatSettings?.waiting_message || null,
          primary_color: brandSettings?.primary_color || null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-widget-config:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
