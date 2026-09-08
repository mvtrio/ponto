import { useCallback, useEffect, useState } from "react";

import {
  fetchCorrectionsByStatus,
  fetchReviewedCorrections,
  type DetailedCorrection,
} from "./correctionService";

function useCorrectionList(loader: () => Promise<DetailedCorrection[]>, errorLabel: string) {
  const [corrections, setCorrections] = useState<DetailedCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCorrections(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : errorLabel);
    } finally {
      setLoading(false);
    }
  }, [loader, errorLabel]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { corrections, loading, error, reload };
}

const loadPending = () => fetchCorrectionsByStatus("pending");
const loadReviewed = () => fetchReviewedCorrections();

export function usePendingCorrections() {
  return useCorrectionList(loadPending, "Erro ao carregar correções pendentes");
}

export function useReviewedCorrections() {
  return useCorrectionList(loadReviewed, "Erro ao carregar o histórico de correções");
}
