import { appDate, appTime, appWeekday } from "../../lib/appDate.ts";
import type { AbsenceKind, DailySummary, Punch } from "../../types/domain.ts";

export type OverviewStatus =
  | "ok"
  | "incomplete"
  | "pending"
  | "rejected"
  | "absent"
  | "atestado"
  | "folga"
  | "liberado"
  | "feriado";

export interface OverviewRow {
  key: string;
  employeeId: string;
  employeeName: string;
  day: string;
  entrada: string | null;
  saida: string | null;
  balanceMinutes: number | null;
  status: OverviewStatus;
  /** Observação do registro de atestado/folga/liberado do dia, quando houver. */
  notes: string | null;
}

/**
 * Monta as linhas do quadro de acompanhamento a partir dos dados crus. Puro, sem IO —
 * é o que permite testar as precedências de status sem banco.
 */
export function buildOverviewRows(
  punches: Punch[],
  summaries: DailySummary[],
  nameById: Map<string, string>,
  /** Observações das ausências registradas, por `funcionário|dia`. */
  notesByKey: Map<string, string> = new Map(),
  /** Feriados do período (YYYY-MM-DD), nacionais e cadastrados. */
  feriados: Iterable<string> = []
): OverviewRow[] {
  const balanceByKey = new Map(summaries.map((s) => [`${s.employee_id}|${s.day}`, s.balance_minutes]));
  const absenceByKey = new Map<string, AbsenceKind>();
  for (const s of summaries) {
    if (s.absence_kind) absenceByKey.set(`${s.employee_id}|${s.day}`, s.absence_kind);
  }

  const byKey = new Map<string, { employeeId: string; day: string; punches: Punch[] }>();
  for (const punch of punches) {
    const day = appDate(punch.occurred_at);
    const key = `${punch.employee_id}|${day}`;
    const entry = byKey.get(key) ?? { employeeId: punch.employee_id, day, punches: [] };
    entry.punches.push(punch);
    byKey.set(key, entry);
  }

  // O resumo diário também traz faltas — dia útil sem marcação nenhuma. Sem incluí-las
  // aqui, um dia não batido sumiria do quadro do admin e do relatório, embora esteja
  // pesando no saldo.
  for (const summary of summaries) {
    const key = `${summary.employee_id}|${summary.day}`;
    if (!byKey.has(key)) {
      byKey.set(key, { employeeId: summary.employee_id, day: summary.day, punches: [] });
    }
  }

  const rows: OverviewRow[] = [];
  for (const [key, entry] of byKey) {
    const valid = entry.punches.filter((p) => p.approval_status !== "rejected");
    const clockIn = valid.find((p) => p.type === "clock_in");
    const clockOut = valid.find((p) => p.type === "clock_out");

    const hasPending = valid.some((p) => p.approval_status === "pending");
    const hasRejected = entry.punches.some((p) => p.approval_status === "rejected");

    // Atestado e folga valem como explicação do dia, não como ausência: sem isto o dia
    // justificado apareceria como falta ou sumiria do quadro e do relatório.
    const absenceKind = absenceByKey.get(key);

    // Pendente domina: é o que exige ação do admin. "Recusada" só vira o status do dia
    // quando não sobrou nenhuma marcação válida — senão o dia ainda conta como incompleto.
    const status: OverviewStatus = hasPending
      ? "pending"
      : entry.punches.length === 0
      ? absenceKind ?? "absent"
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
      notes: notesByKey.get(key) ?? null,
    });
  }

  // ⚠️ O FERIADO NÃO VEM DE LUGAR NENHUM, e é por isso que ele precisa ser inserido aqui.
  // As linhas acima nascem de marcação ou de resumo diário, e a view `daily_summary` só
  // gera linha para dia útil (`is_holiday`). Resultado: o feriado sem marcação não era
  // falta nem nada — simplesmente sumia do meio da sequência, e quem olhava via 19/11
  // logo abaixo de 23/11, como se o dia não tivesse existido. A linha é montada aqui, e
  // não no SQL, de propósito: no banco de horas o feriado não é cobrado e não deve virar
  // registro; o que falta é só a notícia na tela.
  //
  // Quem trabalhou no feriado já tem linha (as marcações existem), e essa linha fica como
  // está: mostrar "Feriado" por cima apagaria as horas que a pessoa de fato cumpriu.
  const primeiroDia = new Map<string, string>();
  for (const row of rows) {
    const atual = primeiroDia.get(row.employeeId);
    if (!atual || row.day < atual) primeiroDia.set(row.employeeId, row.day);
  }

  for (const [employeeId, inicio] of primeiroDia) {
    for (const day of feriados) {
      // Antes do primeiro dia da pessoa no período não há o que noticiar: ela ainda não
      // estava sendo acompanhada, e a linha seria invenção.
      if (day < inicio) continue;
      if (byKey.has(`${employeeId}|${day}`)) continue;
      // Feriado em fim de semana não ganha linha: sábado e domingo nunca aparecem no
      // quadro, e abrir uma exceção só para eles criaria um dia solto sem par.
      const diaDaSemana = appWeekday(day);
      if (diaDaSemana === 0 || diaDaSemana === 6) continue;

      rows.push({
        key: `${employeeId}|${day}`,
        employeeId,
        employeeName: nameById.get(employeeId) ?? "Funcionário",
        day,
        entrada: null,
        saida: null,
        balanceMinutes: null,
        status: "feriado",
        notes: null,
      });
    }
  }

  return rows.sort((a, b) =>
    a.day === b.day ? a.employeeName.localeCompare(b.employeeName) : b.day.localeCompare(a.day)
  );
}
