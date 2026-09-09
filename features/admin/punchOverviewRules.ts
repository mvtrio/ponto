import { appDate, appTime } from "../../lib/appDate.ts";
import type { DailySummary, Punch } from "../../types/domain.ts";

export type OverviewStatus = "ok" | "incomplete" | "pending" | "rejected";

export interface OverviewRow {
  key: string;
  employeeId: string;
  employeeName: string;
  day: string;
  entrada: string | null;
  saida: string | null;
  balanceMinutes: number | null;
  status: OverviewStatus;
}

/**
 * Monta as linhas do quadro de acompanhamento a partir dos dados crus. Puro, sem IO —
 * é o que permite testar as precedências de status sem banco.
 */
export function buildOverviewRows(
  punches: Punch[],
  summaries: DailySummary[],
  nameById: Map<string, string>
): OverviewRow[] {
  const balanceByKey = new Map(summaries.map((s) => [`${s.employee_id}|${s.day}`, s.balance_minutes]));

  const byKey = new Map<string, { employeeId: string; day: string; punches: Punch[] }>();
  for (const punch of punches) {
    const day = appDate(punch.occurred_at);
    const key = `${punch.employee_id}|${day}`;
    const entry = byKey.get(key) ?? { employeeId: punch.employee_id, day, punches: [] };
    entry.punches.push(punch);
    byKey.set(key, entry);
  }

  const rows: OverviewRow[] = [];
  for (const [key, entry] of byKey) {
    const valid = entry.punches.filter((p) => p.approval_status !== "rejected");
    const clockIn = valid.find((p) => p.type === "clock_in");
    const clockOut = valid.find((p) => p.type === "clock_out");

    const hasPending = valid.some((p) => p.approval_status === "pending");
    const hasRejected = entry.punches.some((p) => p.approval_status === "rejected");

    // Pendente domina: é o que exige ação do admin. "Recusada" só vira o status do dia
    // quando não sobrou nenhuma marcação válida — senão o dia ainda conta como incompleto.
    const status: OverviewStatus = hasPending
      ? "pending"
      : !clockIn || !clockOut
      ? hasRejected && valid.length === 0
        ? "rejected"
        : "incomplete"
      : "ok";

    rows.push({
      key,
      employeeId: entry.employeeId,
      employeeName: nameById.get(entry.employeeId) ?? "Funcionário",
      day: entry.day,
      entrada: clockIn ? appTime(clockIn.occurred_at) : null,
      saida: clockOut ? appTime(clockOut.occurred_at) : null,
      // Pendente não gera saldo: mostrar um número seria afirmar algo que ainda não vale.
      balanceMinutes: hasPending ? null : balanceByKey.get(key) ?? null,
      status,
    });
  }

  return rows.sort((a, b) =>
    a.day === b.day ? a.employeeName.localeCompare(b.employeeName) : b.day.localeCompare(a.day)
  );
}
