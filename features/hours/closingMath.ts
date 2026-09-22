export interface HourBankState {
  debitMinutes: number;
  overtimeMinutes: number;
}

export interface ClosingResult {
  /** Quanto das extras foi usado para abater o débito. */
  appliedMinutes: number;
  /** O que sobra de cada lado e segue para o mês seguinte. Um deles é sempre zero. */
  carryDebitMinutes: number;
  carryCreditMinutes: number;
}

/**
 * O encontro entre os dois lados do banco de horas.
 *
 * As extras pagam o débito até onde alcançam. O que sobrar — de um lado ou do outro,
 * nunca dos dois — passa para o mês seguinte.
 */
export function applyOvertimeToDebit(state: HourBankState): ClosingResult {
  const debit = Math.max(0, Math.round(state.debitMinutes));
  const overtime = Math.max(0, Math.round(state.overtimeMinutes));
  const applied = Math.min(debit, overtime);

  return {
    appliedMinutes: applied,
    carryDebitMinutes: debit - applied,
    carryCreditMinutes: overtime - applied,
  };
}

/** Rótulo do mês como "Setembro/2026", a partir de uma data AAAA-MM-DD. */
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function monthLabel(day: string): string {
  const [year, month] = day.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]}/${year}`;
}

/**
 * Último dia do mês, em AAAA-MM-DD. Aceita "AAAA-MM" ou "AAAA-MM-DD".
 *
 * É a data em que o fechamento apura: quem fecha agosto no meio de setembro precisa ver
 * o saldo de 31/08, não o de hoje.
 */
export function monthEnd(month: string): string {
  const [year, m] = month.split("-").map(Number);

  // Enquanto o admin digita, o campo passa por "2026-0" e afins. Sem esta checagem o
  // Date sai inválido e só estoura lá no toISOString, derrubando a tela inteira.
  if (!Number.isInteger(year) || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error(`Mês inválido: ${month}`);
  }

  // Dia 0 do mês seguinte é o último dia deste.
  return new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10);
}

/** `true` quando a string é um mês completo no formato AAAA-MM. */
export function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month) && Number(month.slice(5)) >= 1 && Number(month.slice(5)) <= 12;
}

/** Primeiro dia do mês anterior ao de `day`, em AAAA-MM-DD. Mês a fechar por padrão. */
export function previousMonthStart(day: string): string {
  const [year, month] = day.split("-").map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
}
