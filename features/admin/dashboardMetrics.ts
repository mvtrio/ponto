import type { DailySummary } from "../../types/domain.ts";
import type { OverviewRow } from "./punchOverviewRules.ts";

export interface PeriodMetrics {
  /** Dias com entrada e saída aprovadas. */
  workedDays: number;
  /** Dias úteis sem marcação e sem justificativa. */
  absentDays: number;
  /** Dias cobertos por atestado ou folga. */
  justifiedDays: number;
  /** Dias com marcação faltando a outra ponta do par. */
  incompleteDays: number;
  /** Dias com marcação aguardando aprovação do admin. */
  pendingDays: number;
  workedMinutes: number;
  expectedMinutes: number;
  /**
   * Presença sobre os dias efetivamente cobrados, de 0 a 1.
   *
   * Dias justificados ficam fora das duas pontas: cobrar atestado como ausência puniria
   * no indicador o que o sistema já decidiu não cobrar no saldo. `null` quando não houve
   * nenhum dia cobrado — não é 100%, é ausência de base para afirmar qualquer coisa.
   */
  attendanceRate: number | null;
}

/**
 * Números do período para o painel gerencial.
 *
 * Recebe as linhas já classificadas (de onde vêm os status) e os resumos diários (de onde
 * vêm os minutos). Puro: é o que permite conferir os indicadores sem banco nem tela.
 */
export function buildPeriodMetrics(rows: OverviewRow[], summaries: DailySummary[]): PeriodMetrics {
  let workedDays = 0;
  let absentDays = 0;
  let justifiedDays = 0;
  let incompleteDays = 0;
  let pendingDays = 0;

  for (const row of rows) {
    switch (row.status) {
      case "ok":
        workedDays += 1;
        break;
      case "absent":
        absentDays += 1;
        break;
      case "atestado":
      case "folga":
        justifiedDays += 1;
        break;
      case "pending":
        pendingDays += 1;
        break;
      default:
        // incomplete e rejected: o dia tem marcação, mas não fecha o par.
        incompleteDays += 1;
    }
  }

  let workedMinutes = 0;
  let expectedMinutes = 0;
  for (const summary of summaries) {
    workedMinutes += summary.worked_minutes;
    // Dia justificado não é cobrado, então não entra na jornada esperada — somá-lo faria
    // o total parecer uma dívida que não existe.
    if (!summary.absence_kind) expectedMinutes += summary.standard_daily_minutes;
  }

  const charged = workedDays + incompleteDays + absentDays;

  return {
    workedDays,
    absentDays,
    justifiedDays,
    incompleteDays,
    pendingDays,
    workedMinutes,
    expectedMinutes,
    attendanceRate: charged === 0 ? null : (workedDays + incompleteDays) / charged,
  };
}

export interface DailyPoint {
  label: string;
  value: number;
}

/** Saldo de cada dia do período, do mais antigo ao mais recente, para o gráfico. */
export function buildDailyBalanceSeries(summaries: DailySummary[]): DailyPoint[] {
  return [...summaries]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((s) => ({ label: s.day.slice(8, 10), value: s.balance_minutes }));
}

/** Primeiro dia do mês de `day`, em AAAA-MM-DD. */
export function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}
