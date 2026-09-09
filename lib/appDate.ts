/**
 * Fuso único do sistema.
 *
 * "Que dia é esta marcação?" precisa ter UMA resposta. Antes havia três: o cliente
 * agrupava por `occurred_at.slice(0, 10)` (UTC), o `daily_worked_minutes` comparava com
 * `p_day::timestamptz` (fuso da sessão do Postgres, UTC no Supabase) e o índice único
 * usava America/Sao_Paulo. Uma marcação às 21h30 de Brasília é 00h30 UTC do dia seguinte,
 * então caía no dia errado no banco de horas e no cálculo.
 *
 * Tudo passa por aqui, e o SQL usa `at time zone 'America/Sao_Paulo'` — mesmo fuso.
 */
export const APP_TIME_ZONE = "America/Sao_Paulo";

// en-CA formata como YYYY-MM-DD, que é exatamente o formato de data usado nas queries.
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Data (YYYY-MM-DD) de um instante ISO, no fuso do sistema. */
export function appDate(iso: string | Date): string {
  return dateFormatter.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** Hora (HH:MM) de um instante ISO, no fuso do sistema. */
export function appTime(iso: string | Date): string {
  return timeFormatter.format(typeof iso === "string" ? new Date(iso) : iso);
}

export function appToday(): string {
  return appDate(new Date());
}

export function appDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return appDate(d);
}

/**
 * Intervalo [início, fim) em ISO que cobre o dia no fuso do sistema — usado para filtrar
 * `occurred_at`, que é timestamptz. Não dá para comparar com a data crua: o dia local
 * começa às 03:00 UTC (ou 02:00 no horário de verão, se voltar a existir).
 */
export function appDayRange(day: string): { fromIso: string; toIso: string } {
  return { fromIso: startOfAppDay(day), toIso: startOfAppDay(addDays(day, 1)) };
}

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Deslocamento do fuso (ms) naquele instante — lido do próprio Intl, não fixado em -3h. */
function offsetMsAt(date: Date): number {
  const parts: Record<string, string> = {};
  for (const part of offsetFormatter.formatToParts(date)) parts[part.type] = part.value;
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asIfUtc - date.getTime();
}

/** Início do dia local, em ISO (ex.: 2026-09-09 → 2026-09-09T03:00:00.000Z). */
export function startOfAppDay(day: string): string {
  const guess = new Date(`${day}T00:00:00Z`);
  return new Date(guess.getTime() - offsetMsAt(guess)).toISOString();
}

/** Soma dias a uma data YYYY-MM-DD sem passar por fuso nenhum. */
export function addDays(day: string, amount: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + amount);
  return base.toISOString().slice(0, 10);
}

/** Dia da semana (0 = domingo) de uma data YYYY-MM-DD, sem depender do fuso do dispositivo. */
export function appWeekday(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
