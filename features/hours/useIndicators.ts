import { useEffect, useState } from "react";

import type { ChartPoint } from "../../components/charts/MiniLineChart";
import {
  fetchBalanceSeries,
  fetchOvertimeSeries,
  fetchPeriodTotals,
  type Granularity,
} from "./indicatorsService";

function useSeries(
  fetcher: (employeeId: string, fromDate: string, toDate: string, granularity: Granularity) => Promise<ChartPoint[]>,
  employeeId: string | undefined,
  fromDate: string,
  toDate: string,
  granularity: Granularity
) {
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher(employeeId, fromDate, toDate, granularity)
      .then((data) => {
        if (!cancelled) setPoints(data);
      })
      .catch((err) => {
        // Antes o catch zerava a série em silêncio: um gráfico vazio por falha de rede
        // ficava idêntico a um período sem marcações.
        if (!cancelled) {
          setPoints([]);
          setError(err instanceof Error ? err.message : "Erro ao carregar os indicadores");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, fromDate, toDate, granularity]);

  return { points, loading, error };
}

export function useBalanceSeries(
  employeeId: string | undefined,
  fromDate: string,
  toDate: string,
  granularity: Granularity
) {
  return useSeries(fetchBalanceSeries, employeeId, fromDate, toDate, granularity);
}

export function useOvertimeSeries(
  employeeId: string | undefined,
  fromDate: string,
  toDate: string,
  granularity: Granularity
) {
  return useSeries(fetchOvertimeSeries, employeeId, fromDate, toDate, granularity);
}

/** `refreshKey` permite forçar uma recarga (ex.: logo após bater ponto). */
export function usePeriodTotals(
  employeeId: string | undefined,
  fromDate: string,
  toDate: string,
  refreshKey = 0
) {
  const [totals, setTotals] = useState<{ overtimeMinutes: number; deficitMinutes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPeriodTotals(employeeId, fromDate, toDate)
      .then((result) => {
        if (!cancelled) setTotals(result);
      })
      .catch((err) => {
        // `null` e não zeros: zero de extras é um resultado válido, falha não é.
        if (!cancelled) {
          setTotals(null);
          setError(err instanceof Error ? err.message : "Erro ao calcular extras e débito");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, fromDate, toDate, refreshKey]);

  return {
    overtimeMinutes: totals?.overtimeMinutes ?? null,
    deficitMinutes: totals?.deficitMinutes ?? null,
    loading,
    error,
  };
}
