import { useEffect, useState } from "react";

import { fetchClosingsForEmployee, type MonthClosing } from "./closingService";

/** Meses já fechados do funcionário, do mais recente para o mais antigo. */
export function useClosings(employeeId: string | undefined) {
  const [closings, setClosings] = useState<MonthClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchClosingsForEmployee(employeeId)
      .then((result) => {
        if (!cancelled) setClosings(result);
      })
      .catch((err) => {
        // Lista vazia com erro à vista, e não lista vazia silenciosa: "nenhum mês
        // fechado" e "não consegui carregar" são coisas diferentes para quem confere.
        if (!cancelled) {
          setClosings([]);
          setError(err instanceof Error ? err.message : "Erro ao carregar os fechamentos");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  return { closings, loading, error };
}
