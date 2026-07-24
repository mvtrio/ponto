import { useEffect, useState } from "react";

import { fetchHourBankBalance } from "./hoursService";

export function useHourBank(employeeId: string | undefined) {
  const [balanceMinutes, setBalanceMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    fetchHourBankBalance(employeeId)
      .then((balance) => {
        if (!cancelled) setBalanceMinutes(balance);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar banco de horas");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  return { balanceMinutes, loading, error };
}
