import { useEffect, useState } from "react";

import type { ChartPoint } from "../../components/charts/MiniLineChart";
import {
  fetchBalanceSeries,
  fetchOvertimeSeries,
  fetchPeriodOvertimeTotal,
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

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    fetcher(employeeId, fromDate, toDate, granularity)
      .then((data) => {
        if (!cancelled) setPoints(data);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, fromDate, toDate, granularity]);

  return { points, loading };
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
export function usePeriodOvertimeTotal(
  employeeId: string | undefined,
  fromDate: string,
  toDate: string,
  refreshKey = 0
) {
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    fetchPeriodOvertimeTotal(employeeId, fromDate, toDate)
      .then((total) => {
        if (!cancelled) setTotalMinutes(total);
      })
      .catch(() => {
        if (!cancelled) setTotalMinutes(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, fromDate, toDate, refreshKey]);

  return { totalMinutes, loading };
}
