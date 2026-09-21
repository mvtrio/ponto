import type { DailySummary } from "../../types/domain.ts";

export interface PeriodTotals {
  /** Só a parte positiva dos saldos diários — o que virou hora extra. */
  overtimeMinutes: number;
  /** Só a parte negativa, em valor absoluto — o que ficou devendo. */
  deficitMinutes: number;
}

/**
 * Extras e débito do período, separados.
 *
 * O saldo líquido sozinho esconde a história: +1h de extra com 10h de débito não é a
 * mesma coisa que um saldo de -9h sem contexto. Somar as duas pontas em separado deixa
 * isso visível.
 */
export function sumPeriodTotals(summaries: DailySummary[]): PeriodTotals {
  let overtimeMinutes = 0;
  let deficitMinutes = 0;

  for (const row of summaries) {
    if (row.balance_minutes > 0) overtimeMinutes += row.balance_minutes;
    else deficitMinutes += -row.balance_minutes;
  }

  return { overtimeMinutes, deficitMinutes };
}
