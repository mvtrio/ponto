import { appDate, appWeekday } from "../../lib/appDate.ts";
import type { ActivePunchType, Punch } from "../../types/domain.ts";

/**
 * Regras de marcação, sem acesso a rede ou banco — é o que torna esta parte testável
 * isoladamente. O serviço (punchService) faz o IO e delega a decisão para cá.
 */

/**
 * A jornada é um único par entrada/saída por dia: depois da saída não há próxima
 * marcação (retorna `null`) e o dia fica encerrado.
 *
 * Marcações rejeitadas não contam — a rejeição existe justamente para liberar o
 * funcionário a marcar de novo.
 */
export function nextPunchType(todayPunches: Punch[]): ActivePunchType | null {
  const valid = todayPunches.filter((p) => p.approval_status !== "rejected");
  const hasClockIn = valid.some((p) => p.type === "clock_in");
  const hasClockOut = valid.some((p) => p.type === "clock_out");

  if (!hasClockIn) return "clock_in";
  if (!hasClockOut) return "clock_out";
  return null;
}

/**
 * A funcionária só marca ponto em dia de semana. `workWeekDays` vem de
 * company_settings (0 = domingo), então mudar a escala é configuração, não código.
 *
 * Feriado não é bloqueado de propósito: trabalhar em feriado acontece e o sistema sabe
 * representar isso como hora extra. O que não existe é expediente de fim de semana.
 */
export function canPunchOnDay(day: string, workWeekDays: number[]): boolean {
  return workWeekDays.includes(appWeekday(day));
}

/**
 * Dias passados em que a entrada foi registrada e a saída não.
 *
 * Conta como registrada a saída que ainda aguarda aprovação: a funcionária já fez a
 * parte dela, e avisar "você não registrou" nesse caso seria falso — o que falta é a
 * revisão do admin. Só a marcação recusada volta a contar como ausente, porque aí
 * realmente não há registro válido.
 *
 * O dia corrente fica de fora: a saída ainda vai acontecer.
 */
export function daysMissingClockOut(punches: Punch[], today: string): string[] {
  const byDay = new Map<string, { entrada: boolean; saida: boolean }>();

  for (const punch of punches) {
    if (punch.approval_status === "rejected") continue;
    const day = appDate(punch.occurred_at);
    if (day >= today) continue;

    const entry = byDay.get(day) ?? { entrada: false, saida: false };
    if (punch.type === "clock_in") entry.entrada = true;
    if (punch.type === "clock_out") entry.saida = true;
    byDay.set(day, entry);
  }

  return Array.from(byDay.entries())
    .filter(([, v]) => v.entrada && !v.saida)
    .map(([day]) => day)
    .sort((a, b) => b.localeCompare(a));
}
