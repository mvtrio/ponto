import { useEffect, useState } from "react";

import { fetchCompanySettings } from "./companySettingsService";
import type { CompanySettings } from "../../types/domain";

/**
 * Configurações da empresa (jornada, escala semanal, intervalo).
 *
 * O erro é devolvido em vez de engolido: sem saber a escala, a tela não pode decidir se
 * o dia permite marcação, e assumir que permite abriria a porta para o ponto de fim de
 * semana que a regra proíbe.
 */
export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCompanySettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setSettings(null);
          setError(err instanceof Error ? err.message : "Erro ao carregar as configurações");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading, error };
}
