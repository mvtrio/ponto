import { useEffect, useState } from "react";

import type { DailySummary } from "../../types/domain";
import { fetchDailySummaries } from "./hoursService";

export function useDailySummaries(employeeId: string | undefined, fromDate: string, toDate: string) {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    fetchDailySummaries(employeeId, fromDate, toDate)
      .then((data) => {
        if (!cancelled) setSummaries(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar resumo");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, fromDate, toDate]);

  return { summaries, loading, error };
}
