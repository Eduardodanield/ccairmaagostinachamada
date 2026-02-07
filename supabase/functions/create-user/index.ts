import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated and is a director
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado: header de autorização ausente");
    }

    // Create client with caller's token to verify identity
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: callerError } = await supabaseClient.auth.getUser();
    if (callerError || !caller) {
      throw new Error("Não autorizado: usuário não autenticado");
    }

    // Create admin client to check role and create user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify caller is a director
    const { data: roleData, error: roleCheckError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (roleCheckError || roleData?.role !== "director") {
      throw new Error("Acesso negado: apenas diretores podem criar usuários");
    }

    // Parse request body
    const { email, password, fullName, role } = await req.json();

    // Validate role - only allow 'teacher' to be created via this endpoint
    if (role !== "teacher") {
      throw new Error("Apenas contas de professor podem ser criadas por este endpoint");
    }

    // Create user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      throw createError;
    }

    if (!userData.user) {
      throw new Error("Falha ao criar usuário");
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert([{ user_id: userData.user.id, role }]);

    if (roleError) {
      throw roleError;
    }

    return new Response(
      JSON.stringify({ success: true, userId: userData.user.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
