import { useCallback, useEffect, useState } from "react";

import { addDays, appDaysAgo, startOfAppDay } from "../../lib/appDate";
import { fetchPunchesForRange } from "./punchService";
import type { Punch } from "../../types/domain";

/**
 * Últimos registros do funcionário, do mais recente para o mais antigo.
 * O erro é devolvido, não engolido: lista vazia por falha não pode parecer "sem marcações".
 */
export function usePunchHistory(employeeId: string | undefined, days: number, refreshKey = 0) {
  const [punches, setPunches] = useState<Punch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const fromIso = startOfAppDay(appDaysAgo(days - 1));
      const toIso = startOfAppDay(addDays(appDaysAgo(0), 1));
      const rows = await fetchPunchesForRange(employeeId, fromIso, toIso);
      setPunches(rows.slice().reverse());
    } catch (err) {
      setPunches([]);
      setError(err instanceof Error ? err.message : "Erro ao carregar os registros");
    } finally {
      setLoading(false);
    }
  }, [employeeId, days]);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  return { punches, loading, error, reload };
}
