import { createClient } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Envio de link de recuperação por e-mail. A tela de redefinir senha não usa mais este
 * fluxo (passou a definir a senha direto), mas ele segue disponível para reativar o
 * envio por e-mail sem reescrever nada.
 */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function updateOwnPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Redefinição pela tela de "Definir nova senha", funcionando com o usuário deslogado.
 *
 * A senha atual é o que identifica e autoriza: o login é feito num cliente isolado (sem
 * persistir sessão, com storageKey próprio, para não mexer na sessão do app) e a troca
 * acontece nesse cliente, que já tem a sessão da conta.
 *
 * Não existe caminho "só com o e-mail": a chave anônima não tem privilégio para alterar
 * outra conta, e um endpoint que fizesse isso sem autenticação permitiria a qualquer um
 * tomar a conta de qualquer usuário. Quem esqueceu a senha precisa do administrador
 * (tela de Funcionários) ou do painel do Supabase.
 */
export async function resetPasswordForEmail(email: string, currentPassword: string, newPassword: string) {
  const client = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL as string,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: `sb-temp-reset-${Date.now()}`,
      },
    }
  );

  const { error: signInError } = await client.auth.signInWithPassword({
    email: email.trim(),
    password: currentPassword,
  });
  if (signInError) throw new Error("E-mail ou senha atual incorretos.");

  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw error;

  await client.auth.signOut();
}

/**
 * Troca a senha exigindo a senha atual. O Supabase não valida a senha antiga em
 * `updateUser`, então ela é conferida com um login em um cliente isolado (sem persistir
 * sessão e com storageKey próprio) — assim a sessão ativa do usuário não é substituída
 * nem disputa lock com o cliente principal.
 */
export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Sessão inválida.");

  const verifyClient = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL as string,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: `sb-temp-verify-${Date.now()}`,
      },
    }
  );

  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) throw new Error("Senha atual incorreta.");

  await updateOwnPassword(newPassword);
}

export async function updateOwnFullName(fullName: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão inválida.");
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) throw error;
}
