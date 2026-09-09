import { fetchDailySummariesForAll } from "../hours/hoursService";
import { fetchPunchesForRangeAll } from "../punches/punchService";
import { addDays, startOfAppDay } from "../../lib/appDate";
import { fetchEmployees } from "./adminService";
import { buildOverviewRows, type OverviewRow } from "./punchOverviewRules";

export type { OverviewRow, OverviewStatus } from "./punchOverviewRules";

export interface PunchOverview {
  rows: OverviewRow[];
  /** Funcionários com marcação no período, para o filtro da tela. */
  employees: { id: string; name: string }[];
  pendingCount: number;
}

/**
 * Quadro de acompanhamento das marcações de todos os funcionários no período.
 *
 * Três consultas no total (funcionários, marcações, resumo diário) em vez de uma rodada
 * por funcionário: a visão geral cresce com o número de pessoas e não deve multiplicar
 * requisições. Só dias com alguma marcação aparecem — dia sem marcação nenhuma é assunto
 * do banco de horas individual, não deste acompanhamento.
 */
export async function fetchPunchOverview(fromDate: string, toDate: string): Promise<PunchOverview> {
  const [employees, punches, summaries] = await Promise.all([
    fetchEmployees(),
    fetchPunchesForRangeAll(startOfAppDay(fromDate), startOfAppDay(addDays(toDate, 1))),
    fetchDailySummariesForAll(fromDate, toDate),
  ]);

  const nameById = new Map(employees.map((e) => [e.id, e.full_name]));
  const rows = buildOverviewRows(punches, summaries, nameById);

  const present = new Map<string, string>();
  for (const row of rows) present.set(row.employeeId, row.employeeName);

  return {
    rows,
    employees: Array.from(present, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    pendingCount: rows.filter((r) => r.status === "pending").length,
  };
}
