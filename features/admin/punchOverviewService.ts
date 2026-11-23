import { fetchDailySummariesForAll } from "../hours/hoursService";
import { fetchPunchesForRangeAll } from "../punches/punchService";
import { addDays, appToday, appWeekday, startOfAppDay } from "../../lib/appDate";
import { fetchEmployees } from "./adminService";
import { fetchAbsenceNotes } from "./absencesService";
import { fetchCompanySettings } from "../company/companySettingsService";
import { fetchHolidays } from "../company/holidaysService";
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
 * Uma rodada de consultas para todo mundo (funcionários, marcações, resumo diário,
 * observações e feriados) em vez de uma rodada por funcionário: a visão geral cresce com
 * o número de pessoas e não deve multiplicar requisições. Dia sem marcação nenhuma é
 * assunto do banco de horas individual, não deste acompanhamento — exceto falta, ausência
 * justificada, feriado e fim de semana, que precisam aparecer para o dia não sumir da
 * sequência.
 */
export async function fetchPunchOverview(fromDate: string, toDate: string): Promise<PunchOverview> {
  const [employees, punches, summaries, notesByKey, holidays, settings] = await Promise.all([
    fetchEmployees(),
    fetchPunchesForRangeAll(startOfAppDay(fromDate), startOfAppDay(addDays(toDate, 1))),
    fetchDailySummariesForAll(fromDate, toDate),
    fetchAbsenceNotes(fromDate, toDate),
    fetchHolidays(fromDate, toDate),
    fetchCompanySettings(),
  ]);

  const nameById = new Map(employees.map((e) => [e.id, e.full_name]));
  // Feriado e folga futuros ficam de fora: o quadro vai até hoje, e anunciar um dia que
  // ainda não chegou o faria parecer um dia já apurado.
  const hoje = appToday();
  const ultimoDia = toDate < hoje ? toDate : hoje;
  const feriados = holidays.map((h) => h.day).filter((day) => day <= hoje);

  // Dia fora da escala — hoje sábado e domingo, mas quem manda é work_week_days, a mesma
  // fonte que o banco de horas usa para decidir o que é dia útil.
  const folgas: string[] = [];
  for (let day = fromDate; day <= ultimoDia; day = addDays(day, 1)) {
    if (!settings.work_week_days.includes(appWeekday(day))) folgas.push(day);
  }

  const rows = buildOverviewRows(punches, summaries, nameById, notesByKey, feriados, folgas);

  const present = new Map<string, string>();
  for (const row of rows) present.set(row.employeeId, row.employeeName);

  return {
    rows,
    employees: Array.from(present, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    pendingCount: rows.filter((r) => r.status === "pending").length,
  };
}
