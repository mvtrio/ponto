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
 * Redefinição pela tela de "Definir nova senha": o e-mail informado precisa bater com o
 * da conta da sessão ativa (a que o link de recuperação abre, ou a de quem já está
 * logado). O e-mail identifica e confere a conta — não é possível trocar a senha de
 * outra conta a partir do app, porque a chave anônima não tem esse privilégio.
 */
export async function resetPasswordForEmail(email: string, newPassword: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error(
      "Não há sessão ativa para identificar a conta. Peça ao administrador para redefinir sua senha."
    );
  }

  if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error("O e-mail informado não corresponde à conta desta sessão.");
  }

  await updateOwnPassword(newPassword);
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
