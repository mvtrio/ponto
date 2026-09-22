export type AbsenceKind = "atestado" | "folga";

export interface AbsenceRangeResult {
  days: string[];
  error: string | null;
}

/** Soma dias a uma data AAAA-MM-DD sem passar por fuso: aritmética de calendário pura. */
function addCalendarDays(day: string, amount: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + amount));
  return date.toISOString().slice(0, 10);
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(day: string): boolean {
  if (!ISO_DAY.test(day)) return false;
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

/**
 * Expande o intervalo informado na lista de dias a registrar.
 *
 * Atestado quase nunca é de um dia só, então a tela aceita início e fim. Fim vazio
 * significa um dia único — é o caso mais comum e obrigar a repetir a data seria ruído.
 */
export function buildAbsenceDays(fromDay: string, toDay: string): AbsenceRangeResult {
  if (!isRealDate(fromDay)) {
    return { days: [], error: "Data inicial inválida. Use o formato AAAA-MM-DD." };
  }

  const end = toDay.trim() === "" ? fromDay : toDay;
  if (!isRealDate(end)) {
    return { days: [], error: "Data final inválida. Use o formato AAAA-MM-DD." };
  }
  if (end < fromDay) {
    return { days: [], error: "A data final não pode ser anterior à inicial." };
  }

  // Um atestado longo é plausível; um intervalo de anos é dedo escorregando na data.
  const days: string[] = [];
  for (let day = fromDay; day <= end; day = addCalendarDays(day, 1)) {
    days.push(day);
    if (days.length > 366) {
      return { days: [], error: "Intervalo muito longo. Registre no máximo um ano por vez." };
    }
  }

  return { days, error: null };
}
