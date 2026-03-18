import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is director
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (roleData?.role !== "director") {
      return json({ error: "Acesso negado" }, 403);
    }

    const { email, password, fullName } = await req.json();

    const updates: Record<string, unknown> = {};
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return json({ error: "Formato de email inválido" }, 400);
      }
      updates.email = email;
      updates.email_confirm = true;
    }
    if (password) {
      if (password.length < 6) {
        return json({ error: "A senha deve ter pelo menos 6 caracteres" }, 400);
      }
      updates.password = password;
    }
    if (fullName) {
      updates.user_metadata = { full_name: fullName };
    }

    if (Object.keys(updates).length === 0) {
      return json({ error: "Nenhuma alteração fornecida" }, 400);
    }

    // Update auth user
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      caller.id,
      updates
    );

    if (updateError) {
      console.error("[update-admin-credentials] Error:", updateError);
      return json({ error: "Falha ao atualizar credenciais" }, 500);
    }

    // Update profile if email or name changed
    const profileUpdates: Record<string, string> = {};
    if (email) profileUpdates.email = email;
    if (fullName) profileUpdates.full_name = fullName;

    if (Object.keys(profileUpdates).length > 0) {
      await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", caller.id);
    }

    return json({ success: true });
  } catch (error) {
    console.error("[update-admin-credentials] Unexpected error:", error);
    return json({ error: "Erro inesperado" }, 500);
  }
});
