import { fetchDailySummariesForAll } from "../hours/hoursService";
import { countPendingPunches } from "../punches/punchService";
import { fetchHourBankState, fetchClosings } from "../hours/closingService";
import { monthLabel, previousMonthStart } from "../hours/closingMath";
import { appToday } from "../../lib/appDate";
import { fetchEmployees } from "./adminService";
import { fetchPunchOverview } from "./punchOverviewService";
import {
  buildDailyBalanceSeries,
  buildPeriodMetrics,
  monthStart,
  type DailyPoint,
  type PeriodMetrics,
} from "./dashboardMetrics";

export interface EmployeeBank {
  id: string;
  fullName: string;
  debitMinutes: number | null;
  overtimeMinutes: number | null;
}

export interface DashboardData {
  /** Mês corrente, para o título da seção. */
  monthLabel: string;
  metrics: PeriodMetrics;
  dailySeries: DailyPoint[];
  employees: EmployeeBank[];
  totalDebitMinutes: number;
  totalOvertimeMinutes: number;
  pendingApprovals: number;
  /** Funcionários cujo mês anterior ainda não foi fechado. */
  unclosedEmployees: string[];
  previousMonthLabel: string;
}

/**
 * Dados do painel gerencial: o mês corrente de todos os funcionários mais o banco de
 * horas acumulado de cada um.
 *
 * O saldo individual vem de `hour_bank_state`, uma chamada por funcionário — é a mesma
 * conta que as outras telas usam, e duplicá-la em SQL só para o painel abriria espaço
 * para dois números divergentes na mesma aplicação.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const today = appToday();
  const from = monthStart(today);
  const previousMonth = previousMonthStart(today);

  const [overview, summaries, employees, closings, pendingApprovals] = await Promise.all([
    fetchPunchOverview(from, today),
    fetchDailySummariesForAll(from, today),
    fetchEmployees(),
    fetchClosings().catch(() => []),
    // Contagem global, e não a do mês corrente: uma marcação de setembro ainda pendente
    // continua exigindo ação. Restringi-la ao mês mostraria zero no painel enquanto o
    // sino do cabeçalho acusa pendências — dois números para o mesmo fato.
    countPendingPunches(),
  ]);

  const active = employees.filter((e) => e.active && e.role !== "admin");

  const banks = await Promise.all(
    active.map(async (e): Promise<EmployeeBank> => {
      try {
        const state = await fetchHourBankState(e.id);
        return {
          id: e.id,
          fullName: e.full_name,
          debitMinutes: state.debitMinutes,
          overtimeMinutes: state.overtimeMinutes,
        };
      } catch {
        // `null` e não zero: um saldo que falhou ao carregar não é um saldo zerado, e
        // somá-lo como zero no total mentiria para quem está conferindo.
        return { id: e.id, fullName: e.full_name, debitMinutes: null, overtimeMinutes: null };
      }
    })
  );

  const closedPreviousMonth = new Set(
    closings.filter((c) => c.month === previousMonth).map((c) => c.employee_id)
  );

  return {
    monthLabel: monthLabel(from),
    metrics: buildPeriodMetrics(overview.rows, summaries),
    dailySeries: buildDailyBalanceSeries(summaries),
    employees: banks.sort((a, b) => (b.debitMinutes ?? 0) - (a.debitMinutes ?? 0)),
    totalDebitMinutes: banks.reduce((sum, b) => sum + (b.debitMinutes ?? 0), 0),
    totalOvertimeMinutes: banks.reduce((sum, b) => sum + (b.overtimeMinutes ?? 0), 0),
    pendingApprovals,
    unclosedEmployees: active.filter((e) => !closedPreviousMonth.has(e.id)).map((e) => e.full_name),
    previousMonthLabel: monthLabel(previousMonth),
  };
}
