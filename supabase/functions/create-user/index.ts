import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CreateUserPayload = {
  email: string;
  password: string;
  fullName: string;
  role: "teacher";
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autorizado: header de autorização ausente" }, 401);
    }

    // Client with caller's token to verify identity
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
      return json({ error: "Não autorizado: usuário não autenticado" }, 401);
    }

    // Admin client (service role)
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

    // Verify caller is a director (use maybeSingle to avoid hard failure)
    const { data: roleData, error: roleCheckError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (roleCheckError || roleData?.role !== "director") {
      return json({ error: "Acesso negado: apenas diretores podem criar usuários" }, 403);
    }

    const payload = (await req.json()) as Partial<CreateUserPayload>;
    const email = (payload.email ?? "").trim().toLowerCase();
    const password = payload.password ?? "";
    const fullName = (payload.fullName ?? "").trim();
    const role = payload.role;

    if (!email || !password || !fullName) {
      return json({ error: "Dados inválidos: email, senha e nome são obrigatórios" }, 400);
    }

    if (role !== "teacher") {
      return json(
        { error: "Apenas contas de professor podem ser criadas por este endpoint" },
        400
      );
    }

    const findExistingUserIdByEmail = async (targetEmail: string): Promise<string | null> => {
      // Small projects: list and match. If you have many users later, we can paginate.
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const found = data?.users?.find((u) => (u.email ?? "").toLowerCase() === targetEmail);
      return found?.id ?? null;
    };

    let userId: string | null = null;

    // Try to create user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      const msg = (createError as { message?: string }).message ?? "";
      const code = (createError as { code?: string }).code ?? "";
      const isEmailExists =
        code === "email_exists" ||
        msg.toLowerCase().includes("already been registered") ||
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("email address has already") ||
        msg.toLowerCase().includes("email_exists");

      if (!isEmailExists) {
        console.error("[create-user] createUser failed:", createError);
        return json({ error: msg || "Falha ao criar usuário" }, 400);
      }

      // Email exists in auth system -> reuse existing user
      userId = await findExistingUserIdByEmail(email);
      if (!userId) {
        return json(
          {
            error:
              "O email já existe, mas não consegui localizar o usuário correspondente para atualizar. Tente novamente.",
          },
          409
        );
      }
    } else {
      userId = userData?.user?.id ?? null;
    }

    if (!userId) {
      return json({ error: "Falha ao determinar o usuário" }, 500);
    }

    // Ensure profile exists/updated
    const { error: profileUpsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        [{ user_id: userId, full_name: fullName, email, is_active: true }],
        { onConflict: "user_id" }
      );

    if (profileUpsertError) {
      console.error("[create-user] profile upsert error:", profileUpsertError);
      return json({ error: "Falha ao salvar perfil do professor" }, 400);
    }

    // Replace roles for this user (avoid duplicates)
    const { error: deleteRolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteRolesError) {
      console.error("[create-user] delete roles error:", deleteRolesError);
      return json({ error: "Falha ao atualizar permissões do professor" }, 400);
    }

    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert([{ user_id: userId, role: "teacher" }]);

    if (roleInsertError) {
      console.error("[create-user] insert role error:", roleInsertError);
      return json({ error: "Falha ao atribuir função de professor" }, 400);
    }

    return json({ success: true, userId });
  } catch (error) {
    console.error("[create-user] unexpected error:", error);
    return json({ error: (error as { message?: string }).message ?? "Erro inesperado" }, 500);
  }
});
