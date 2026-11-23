import { addDays } from "../../lib/appDate.ts";

/**
 * Feriados nacionais, sem acesso a rede ou banco — é o que torna esta parte testável
 * isoladamente (o serviço importa o client Supabase e não roda no runner do Node).
 *
 * A mesma lista existe no SQL, em `public.is_holiday`. Os dois lados precisam andar
 * juntos: o cliente decide o que a tela mostra como feriado e o SQL decide o que vira
 * falta no banco de horas. Mexeu aqui, mexa na migration.
 */

/** Feriados nacionais de data fixa (Lei 10.607/2002 e Lei 14.759/2023). */
const FIXED: { month: number; date: number; name: string }[] = [
  { month: 1, date: 1, name: "Confraternização Universal" },
  { month: 4, date: 21, name: "Tiradentes" },
  { month: 5, date: 1, name: "Dia do Trabalho" },
  { month: 9, date: 7, name: "Independência do Brasil" },
  { month: 10, date: 12, name: "Nossa Senhora Aparecida" },
  { month: 11, date: 2, name: "Finados" },
  { month: 11, date: 15, name: "Proclamação da República" },
  // Nacional desde a Lei 14.759/2023 — antes disso era só estadual/municipal. Como o
  // controle de ponto começa bem depois (company_settings.tracking_starts_on), não há
  // período anterior a representar e a data vale para todo ano.
  { month: 11, date: 20, name: "Consciência Negra" },
  { month: 12, date: 25, name: "Natal" },
];

function isoDay(year: number, month: number, date: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

/**
 * Domingo de Páscoa pelo algoritmo gregoriano anônimo (Meeus/Jones/Butcher).
 *
 * É daqui que sai a Sexta-feira Santa, único feriado nacional móvel: Carnaval e Corpus
 * Christi são ponto facultativo, então ficam a cargo do admin na tabela `holidays`.
 */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const date = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDay(year, month, date);
}

/** Sexta-feira Santa: dois dias antes da Páscoa. */
export function goodFriday(year: number): string {
  return addDays(easterSunday(year), -2);
}

export interface NationalHoliday {
  day: string;
  name: string;
}

/** Feriados nacionais (fixos + Sexta-feira Santa) no período, em ordem de data. */
export function nationalHolidaysInRange(fromDate: string, toDate: string): NationalHoliday[] {
  const firstYear = Number(fromDate.slice(0, 4));
  const lastYear = Number(toDate.slice(0, 4));
  const holidays: NationalHoliday[] = [];

  for (let year = firstYear; year <= lastYear; year++) {
    for (const h of FIXED) holidays.push({ day: isoDay(year, h.month, h.date), name: h.name });
    holidays.push({ day: goodFriday(year), name: "Sexta-feira Santa" });
  }

  // Comparação de string em YYYY-MM-DD é comparação de data, sem passar por fuso nenhum.
  return holidays.filter((h) => h.day >= fromDate && h.day <= toDate).sort((a, b) => a.day.localeCompare(b.day));
}
