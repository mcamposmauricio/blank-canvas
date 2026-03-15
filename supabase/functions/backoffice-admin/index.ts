import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { action, ...params } = await req.json();

    // accept-invite does NOT require master role — validated by invite_token
    if (action === "accept-invite") {
      const { inviteToken, userId, displayName } = params;
      if (!inviteToken || !userId) throw new Error("inviteToken and userId required");

      const { data: profile, error: profileErr } = await adminClient
        .from("user_profiles")
        .select("id, email, tenant_id, specialty, invite_status")
        .eq("invite_token", inviteToken)
        .eq("invite_status", "pending")
        .maybeSingle();
      if (profileErr || !profile) throw new Error("Invalid or expired invite");

      // Update profile
      const { error: updateErr } = await adminClient.from("user_profiles").update({
        user_id: userId,
        invite_status: "accepted",
        display_name: displayName,
        last_sign_in_at: new Date().toISOString(),
      }).eq("id", profile.id);
      if (updateErr) throw updateErr;

      // Create admin role if tenant admin (no specialty)
      if (profile.tenant_id && (!profile.specialty || profile.specialty.length === 0)) {
        const { error: roleErr } = await adminClient.from("user_roles").upsert(
          { user_id: userId, role: "admin" },
          { onConflict: "user_id,role" }
        );
        if (roleErr) console.error("Role creation error:", roleErr);

        // Auto-provision admin as chat attendant
        const { error: csmErr } = await adminClient.from("csms").insert({
          user_id: userId,
          name: displayName || profile.email.split("@")[0],
          email: profile.email,
          is_chat_enabled: true,
          tenant_id: profile.tenant_id,
        });
        if (csmErr) console.error("CSM auto-provision error:", csmErr);
      }

      // Create CSM if has specialty
      if (profile.specialty && profile.specialty.length > 0) {
        await adminClient.from("csms").insert({
          user_id: userId,
          name: displayName || profile.email.split("@")[0],
          email: profile.email,
          specialty: profile.specialty,
        });
      }

      return new Response(JSON.stringify({ success: true, tenantId: profile.tenant_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require master role
    const { data: masterCheck } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "master").maybeSingle();
    if (!masterCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: master role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    switch (action) {
      case "list-auth-users": {
        const page = params.page || 1;
        const perPage = params.perPage || 50;
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        return new Response(JSON.stringify({ users: data.users, total: data.users.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset-password": {
        const { email } = params;
        if (!email) throw new Error("Email required");
        const { error } = await adminClient.auth.resetPasswordForEmail(email);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: `Reset email sent to ${email}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete-auth-user": {
        const { userId } = params;
        if (!userId) throw new Error("userId required");
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "provision-tenant-admin": {
        const { tenantId, email, displayName } = params;
        if (!tenantId || !email || !displayName) throw new Error("tenantId, email and displayName required");

        const inviteToken = crypto.randomUUID();

        const { data: allUsers } = await adminClient.auth.admin.listUsers();
        const existingAuthUser = allUsers?.users?.find((u: any) => u.email === email);

        const { error: profileErr } = await adminClient.from("user_profiles").insert({
          user_id: null,
          email,
          display_name: displayName,
          tenant_id: tenantId,
          invite_status: "pending",
          invite_token: inviteToken,
          is_active: true,
        });
        if (profileErr) throw profileErr;

        if (existingAuthUser) {
          try {
            await adminClient.auth.resetPasswordForEmail(email, {
              redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth?invite=${inviteToken}`,
            });
          } catch (e) {
            console.error("Warning: could not send notification email:", e);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          inviteToken,
          inviteUrl: `/auth?invite=${inviteToken}`,
          userAlreadyExists: !!existingAuthUser,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "check-email-exists": {
        const { email } = params;
        if (!email) throw new Error("Email required");

        const { data: profiles } = await adminClient
          .from("user_profiles")
          .select("id, email, display_name, tenant_id, invite_status")
          .eq("email", email)
          .eq("invite_status", "accepted");

        const results = [];
        if (profiles && profiles.length > 0) {
          for (const p of profiles) {
            let tenantName = "Sem plataforma";
            if (p.tenant_id) {
              const { data: tenant } = await adminClient
                .from("tenants")
                .select("name")
                .eq("id", p.tenant_id)
                .maybeSingle();
              if (tenant) tenantName = tenant.name;
            }
            results.push({ ...p, tenant_name: tenantName });
          }
        }

        return new Response(JSON.stringify({
          exists: results.length > 0,
          profiles: results,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cleanup-orphan-auth-users": {
        const dryRun = params.dry_run !== false;

        const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        if (authErr) throw authErr;
        const authUsers = authData?.users || [];

        const { data: profileUserIds } = await adminClient
          .from("user_profiles")
          .select("user_id")
          .not("user_id", "is", null);
        const { data: roleUserIds } = await adminClient
          .from("user_roles")
          .select("user_id");

        const knownUserIds = new Set<string>();
        profileUserIds?.forEach((p: any) => { if (p.user_id) knownUserIds.add(p.user_id); });
        roleUserIds?.forEach((r: any) => { if (r.user_id) knownUserIds.add(r.user_id); });
        knownUserIds.add(user.id);

        const orphans = authUsers.filter((u: any) => !knownUserIds.has(u.id));

        if (dryRun) {
          return new Response(JSON.stringify({
            dry_run: true,
            orphan_count: orphans.length,
            orphans: orphans.map((u: any) => ({
              id: u.id,
              email: u.email,
              created_at: u.created_at,
            })),
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const deleted: string[] = [];
        const errors: string[] = [];
        for (const orphan of orphans) {
          try {
            const { error: delErr } = await adminClient.auth.admin.deleteUser(orphan.id);
            if (delErr) {
              errors.push(`${orphan.email}: ${delErr.message}`);
            } else {
              deleted.push(orphan.email || orphan.id);
            }
          } catch (e: any) {
            errors.push(`${orphan.email}: ${e.message}`);
          }
        }

        return new Response(JSON.stringify({
          dry_run: false,
          deleted_count: deleted.length,
          deleted,
          errors,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
