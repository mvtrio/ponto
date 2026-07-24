import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";
import type { Profile } from "../../types/domain";
import { SessionContext, type SessionState } from "./useSession";

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    console.warn("Falha ao buscar profile:", error.message);
    return null;
  }
  return data as unknown as Profile;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, profile: null, loading: true });

  useEffect(() => {
    let mounted = true;

    async function loadSession(session: Session | null) {
      if (!session) {
        if (mounted) setState({ session: null, profile: null, loading: false });
        return;
      }
      const profile = await fetchProfile(session.user.id);
      if (mounted) setState({ session, profile, loading: false });
    }

    supabase.auth.getSession().then(({ data }) => loadSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSession(session);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
