import { useEffect, useState } from "react";

import { fetchHourBankState } from "./closingService";
import type { HourBankState } from "./closingMath";

/**
 * Débito e horas extras acumulados, separados.
 *
 * Antes isto devolvia um número só — o líquido. Quem via "-0h46" não tinha como saber que
 * por trás havia 8h30 devidas e 7h44 trabalhadas a mais; os dois lados só se encontram no
 * fechamento do mês.
 *
 * `refreshKey` permite forçar uma recarga (ex.: logo após bater ponto).
 */
export function useHourBank(employeeId: string | undefined, refreshKey = 0) {
  const [state, setState] = useState<HourBankState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHourBankState(employeeId)
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch((err) => {
        // `null` e não zeros: zero é um saldo válido, falha de carga não é.
        if (!cancelled) {
          setState(null);
          setError(err instanceof Error ? err.message : "Erro ao carregar banco de horas");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey]);

  return {
    debitMinutes: state?.debitMinutes ?? null,
    overtimeMinutes: state?.overtimeMinutes ?? null,
    loading,
    error,
  };
}
