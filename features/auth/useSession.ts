import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

import type { Profile } from "../../types/domain";

export interface SessionState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

export const SessionContext = createContext<SessionState>({
  session: null,
  profile: null,
  loading: true,
});

export function useSession(): SessionState {
  return useContext(SessionContext);
}
