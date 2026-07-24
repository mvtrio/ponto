import { useCallback, useEffect, useState } from "react";

import type { Correction } from "../../types/domain";
import { fetchPendingCorrections } from "./correctionService";

export function usePendingCorrections() {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingCorrections();
      setCorrections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar correções pendentes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { corrections, loading, error, reload };
}
