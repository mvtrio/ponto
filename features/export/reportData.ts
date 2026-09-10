import type { OverviewRow } from "../admin/punchOverviewRules.ts";

export interface EmployeeReport {
  employeeId: string;
  employeeName: string;
  days: OverviewRow[];
  /** Dias com entrada e saída registradas. */
  daysWorked: number;
  daysIncomplete: number;
  daysPending: number;
  /** Soma dos saldos diários já apurados (pendentes não entram). */
  balanceMinutes: number;
  /** Só a parte positiva dos saldos — o que de fato virou hora extra. */
  overtimeMinutes: number;
  /** Só a parte negativa, em valor absoluto. */
  deficitMinutes: number;
}

/**
 * Agrupa as linhas do acompanhamento por funcionário e apura os totais do período.
 * Puro: é o que permite conferir os números do relatório sem gerar PDF.
 *
 * Dias pendentes de aprovação são contados à parte e ficam fora dos totais — somá-los
 * afirmaria horas que ainda não valem.
 */
export function buildReportData(rows: OverviewRow[]): EmployeeReport[] {
  const byEmployee = new Map<string, EmployeeReport>();

  for (const row of rows) {
    let report = byEmployee.get(row.employeeId);
    if (!report) {
      report = {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        days: [],
        daysWorked: 0,
        daysIncomplete: 0,
        daysPending: 0,
        balanceMinutes: 0,
        overtimeMinutes: 0,
        deficitMinutes: 0,
      };
      byEmployee.set(row.employeeId, report);
    }

    report.days.push(row);

    if (row.status === "pending") {
      report.daysPending += 1;
      continue;
    }
    if (row.status === "ok") report.daysWorked += 1;
    else report.daysIncomplete += 1;

    if (row.balanceMinutes !== null) {
      report.balanceMinutes += row.balanceMinutes;
      if (row.balanceMinutes > 0) report.overtimeMinutes += row.balanceMinutes;
      else report.deficitMinutes += -row.balanceMinutes;
    }
  }

  for (const report of byEmployee.values()) {
    // Do dia mais antigo para o mais recente: relatório se lê em ordem cronológica.
    report.days.sort((a, b) => a.day.localeCompare(b.day));
  }

  return Array.from(byEmployee.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}
