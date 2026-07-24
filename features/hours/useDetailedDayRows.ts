import { useEffect, useState } from "react";

import { fetchDetailedDayRows, type DetailedDayRow } from "./detailedDayRows";

export function useDetailedDayRows(employeeId: string | undefined, fromDate: string, toDate: string) {
  const [rows, setRows] = useState<DetailedDayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDetailedDayRows(employeeId, fromDate, toDate)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar marcações");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, fromDate, toDate]);

  return { rows, loading, error };
}
