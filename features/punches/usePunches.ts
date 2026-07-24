import { useCallback, useEffect, useState } from "react";

import type { Punch } from "../../types/domain";
import { fetchPunchesForRange } from "./punchService";

export function usePunchesForRange(employeeId: string | undefined, fromIso: string, toIso: string) {
  const [punches, setPunches] = useState<Punch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPunchesForRange(employeeId, fromIso, toIso);
      setPunches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar marcações");
    } finally {
      setLoading(false);
    }
  }, [employeeId, fromIso, toIso]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { punches, loading, error, reload };
}
