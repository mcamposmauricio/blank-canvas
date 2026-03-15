import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Activate scheduled broadcasts whose time has come
    await supabase
      .from("chat_broadcasts")
      .update({ status: "live", sent_at: new Date().toISOString() })
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    // 2. Get all live broadcasts with pending recipients
    const { data: broadcasts, error: bErr } = await supabase
      .from("chat_broadcasts")
      .select("id, user_id, message, tenant_id")
      .eq("status", "live");

    if (bErr) throw bErr;
    if (!broadcasts || broadcasts.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;

    for (const broadcast of broadcasts) {
      // Fetch sender's attendant profile
      const { data: senderAtt } = await supabase
        .from("attendant_profiles")
        .select("id, display_name")
        .eq("user_id", broadcast.user_id)
        .maybeSingle();

      // Get pending recipients
      const { data: recipients, error: rErr } = await supabase
        .from("chat_broadcast_recipients")
        .select("id, company_contact_id, contact_id")
        .eq("broadcast_id", broadcast.id)
        .eq("status", "pending")
        .limit(50);

      if (rErr) {
        console.error(`Error fetching recipients for ${broadcast.id}:`, rErr);
        continue;
      }

      if (!recipients || recipients.length === 0) {
        await supabase
          .from("chat_broadcasts")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", broadcast.id);
        continue;
      }

      for (const recipient of recipients) {
        try {
          const { data: contact } = await supabase
            .from("company_contacts")
            .select("id, name, email, company_id, chat_visitor_id")
            .eq("id", recipient.company_contact_id)
            .single();

          if (!contact) {
            await supabase
              .from("chat_broadcast_recipients")
              .update({ status: "failed" })
              .eq("id", recipient.id);
            continue;
          }

          // Resolve or create visitor
          let visitorId: string | null = null;

          if (contact.chat_visitor_id) {
            const { data: existing } = await supabase
              .from("chat_visitors")
              .select("id")
              .eq("id", contact.chat_visitor_id)
              .maybeSingle();
            if (existing) visitorId = existing.id;
          }

          if (!visitorId) {
            const { data: byContact } = await supabase
              .from("chat_visitors")
              .select("id")
              .eq("company_contact_id", contact.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (byContact) {
              visitorId = byContact.id;
              await supabase
                .from("company_contacts")
                .update({ chat_visitor_id: visitorId })
                .eq("id", contact.id);
            }
          }

          if (!visitorId) {
            const { data: visitor } = await supabase
              .from("chat_visitors")
              .insert({
                name: contact.name,
                email: contact.email,
                owner_user_id: broadcast.user_id,
                company_contact_id: contact.id,
                contact_id: contact.company_id,
                tenant_id: broadcast.tenant_id,
              })
              .select("id")
              .single();

            if (!visitor) {
              await supabase
                .from("chat_broadcast_recipients")
                .update({ status: "failed" })
                .eq("id", recipient.id);
              continue;
            }
            visitorId = visitor.id;
            await supabase
              .from("company_contacts")
              .update({ chat_visitor_id: visitorId })
              .eq("id", contact.id);
          }

          // Create chat room with attendant assigned
          const { data: room } = await supabase
            .from("chat_rooms")
            .insert({
              visitor_id: visitorId,
              owner_user_id: broadcast.user_id,
              attendant_id: senderAtt?.id ?? null,
              company_contact_id: contact.id,
              contact_id: contact.company_id,
              status: "active",
              assigned_at: new Date().toISOString(),
              tenant_id: broadcast.tenant_id,
              metadata: { broadcast_id: broadcast.id },
            })
            .select("id")
            .single();

          if (!room) {
            await supabase
              .from("chat_broadcast_recipients")
              .update({ status: "failed" })
              .eq("id", recipient.id);
            continue;
          }

          // Insert initial message as attendant (not system)
          await supabase.from("chat_messages").insert({
            room_id: room.id,
            sender_type: senderAtt ? "attendant" : "system",
            sender_id: senderAtt?.id ?? null,
            sender_name: senderAtt?.display_name ?? "Broadcast",
            content: broadcast.message,
            metadata: { broadcast_id: broadcast.id },
          });

          // Update recipient as sent
          await supabase
            .from("chat_broadcast_recipients")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              chat_room_id: room.id,
            })
            .eq("id", recipient.id);

          totalProcessed++;
        } catch (err) {
          console.error(`Error processing recipient ${recipient.id}:`, err);
          await supabase
            .from("chat_broadcast_recipients")
            .update({ status: "failed" })
            .eq("id", recipient.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ processed: totalProcessed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-chat-broadcasts error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
