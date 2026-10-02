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

/**
 * Saldo acumulado dia a dia: onde o mês está indo, e não só como foi cada dia isolado.
 * É a diferença entre "ontem fiz 20 minutos a menos" e "o mês inteiro está devendo 3h".
 */
export function buildCumulativeSeries(summaries: DailySummary[]): DailyPoint[] {
  let running = 0;
  return [...summaries]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((s) => {
      running += s.balance_minutes;
      return { label: s.day.slice(8, 10), value: running };
    });
}

export interface MonthTotals {
  /** AAAA-MM. */
  month: string;
  overtimeMinutes: number;
  /** Positivo. */
  deficitMinutes: number;
}

/** Extras e débito somados por mês, do mais antigo ao mais recente. */
export function buildMonthlyTotals(summaries: DailySummary[]): MonthTotals[] {
  const byMonth = new Map<string, MonthTotals>();

  for (const s of summaries) {
    const month = s.day.slice(0, 7);
    const entry = byMonth.get(month) ?? { month, overtimeMinutes: 0, deficitMinutes: 0 };
    if (s.balance_minutes > 0) entry.overtimeMinutes += s.balance_minutes;
    else entry.deficitMinutes += -s.balance_minutes;
    byMonth.set(month, entry);
  }

  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export interface CompositionSlice {
  key: string;
  label: string;
  value: number;
}

/**
 * Composição dos dias do mês para o gráfico de rosca.
 *
 * Fatias zeradas ficam de fora: desenhar "0 faltas" não acrescenta nada e só suja a
 * legenda de um mês limpo.
 */
export function buildDayComposition(metrics: PeriodMetrics): CompositionSlice[] {
  return [
    { key: "worked", label: "Trabalhados", value: metrics.workedDays },
    { key: "absent", label: "Faltas", value: metrics.absentDays },
    { key: "justified", label: "Atestado/folga", value: metrics.justifiedDays },
    { key: "incomplete", label: "Incompletos", value: metrics.incompleteDays },
    { key: "pending", label: "Aguardando", value: metrics.pendingDays },
  ].filter((slice) => slice.value > 0);
}

/** Primeiro dia do mês de `day`, em AAAA-MM-DD. */
export function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Primeiro dia do mês `count` meses antes do mês de `day`, em AAAA-MM-DD. */
export function monthsBefore(day: string, count: number): string {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  // Date.UTC normaliza mês negativo virando o ano sozinho.
  const d = new Date(Date.UTC(year, month - 1 - count, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
