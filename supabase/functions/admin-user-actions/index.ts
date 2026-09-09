/**
 * ⚠️ RECONSTRUÇÃO — NÃO É O FONTE ORIGINAL IMPLANTADO.
 *
 * A função `admin-user-actions` foi implantada no Supabase sem estar versionada, e o
 * fonte não pôde ser recuperado (o `supabase functions download` exige login e a aba de
 * código do painel não carrega). Este arquivo foi reconstruído a partir do contrato que
 * o cliente usa em features/admin/adminService.ts:
 *
 *   POST { action: "reset_password", employeeId, newPassword }
 *   POST { action: "delete_user",    employeeId }
 *   erro → { error: "mensagem" } com status >= 400
 *
 * ANTES DE IMPLANTAR: comparar com a versão em produção. Um `supabase functions deploy`
 * com este arquivo SUBSTITUI a função ativa — se a original fizer algo a mais, se perde.
 * O objetivo aqui é ter o código sob revisão e não depender de um artefato que ninguém
 * consegue ler.
 *
 * O ponto crítico de segurança é a checagem de admin: a função usa a service role key,
 * que ignora RLS. Sem validar quem chama, qualquer usuário autenticado poderia trocar a
 * senha ou apagar a conta de qualquer outro.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Confere, com o token de quem chamou, que o solicitante é admin ativo. */
async function callerIsAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;

  const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await asCaller.auth.getUser();
  if (!user) return false;

  const { data: profile } = await asCaller
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" && profile?.active === true;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  if (!(await callerIsAdmin(req.headers.get("Authorization")))) {
    return json({ error: "Apenas administradores podem executar esta ação." }, 403);
  }

  let body: { action?: string; employeeId?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo inválido." }, 400);
  }

  const { action, employeeId, newPassword } = body;
  if (!employeeId) return json({ error: "employeeId é obrigatório." }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === "reset_password") {
    if (!newPassword || newPassword.length < 6) {
      return json({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
    }
    const { error } = await admin.auth.admin.updateUserById(employeeId, { password: newPassword });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (action === "delete_user") {
    const { error } = await admin.auth.admin.deleteUser(employeeId);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: `Ação desconhecida: ${action}` }, 400);
});
