import type { ActivePunchType, Punch } from "../../types/domain";

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
