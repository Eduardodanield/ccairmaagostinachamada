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

    const { userId } = await req.json();
    if (!userId) {
      return json({ error: "ID do usuário é obrigatório" }, 400);
    }

    // Prevent deleting self
    if (userId === caller.id) {
      return json({ error: "Você não pode excluir sua própria conta" }, 400);
    }

    // Delete profile and role (cascade will handle some)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

    // Delete from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[delete-user] Error deleting auth user:", deleteError);
      return json({ error: "Falha ao excluir usuário" }, 500);
    }

    return json({ success: true });
  } catch (error) {
    console.error("[delete-user] Unexpected error:", error);
    return json({ error: "Erro inesperado" }, 500);
  }
});
