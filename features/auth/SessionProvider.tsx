import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";
import type { Profile } from "../../types/domain";
import { SessionContext, type SessionState } from "./useSession";

const DEACTIVATED_MESSAGE = "Sua conta foi desativada. Fale com um administrador.";

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    console.warn("Falha ao buscar profile:", error.message);
    return null;
  }
  return data as unknown as Profile;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deactivatedMessage, setDeactivatedMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession(nextSession: Session | null) {
      if (!nextSession) {
        if (mounted) {
          setSession(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      const nextProfile = await fetchProfile(nextSession.user.id);
      if (nextProfile && !nextProfile.active) {
        if (mounted) {
          setSession(null);
          setProfile(null);
          setLoading(false);
          setDeactivatedMessage(DEACTIVATED_MESSAGE);
        }
        // Chamar supabase.auth.signOut() de dentro do callback do onAuthStateChange trava o
        // SDK (deadlock conhecido); adiar para o próximo tick evita isso.
        setTimeout(() => {
          supabase.auth.signOut();
        }, 0);
        return;
      }
      if (mounted) {
        setSession(nextSession);
        setProfile(nextProfile);
        setLoading(false);
        setDeactivatedMessage(null);
      }
    }

    supabase.auth.getSession().then(({ data }) => loadSession(data.session));

    // loadSession consulta `profiles`, ou seja, faz uma chamada Supabase. Rodá-la dentro
    // do callback trava o SDK pelo mesmo motivo do signOut acima: o callback segura o lock
    // de auth enquanto a consulta espera por ele. Quando o evento é um TOKEN_REFRESHED, a
    // renovação empaca, o SDK desiste e emite SIGNED_OUT — a sessão some sozinha no meio
    // do uso e o app cai na tela de login. Adiar para o próximo tick solta o lock antes.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => loadSession(nextSession), 0);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const state: SessionState = {
    session,
    profile,
    loading,
    deactivatedMessage,
    clearDeactivatedMessage: () => setDeactivatedMessage(null),
  };

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
