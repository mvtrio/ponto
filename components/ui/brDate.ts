/**
 * Datas no padrão brasileiro (DD/MM/AAAA) na tela, AAAA-MM-DD por dentro.
 *
 * O app inteiro — consultas, validações, banco — fala ISO. Só o campo que a pessoa vê
 * muda: converter na borda evita espalhar dois formatos pelo código.
 */

export const MONTH_NAMES = [
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

/** Domingo primeiro, como no calendário de parede brasileiro. */
export const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function exists(y: number, m: number, d: number): boolean {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** "2026-11-05" → "05/11/2026". Devolve "" para o que não for uma data ISO válida. */
export function isoToBr(iso: string): string {
  const match = ISO.exec(iso);
  if (!match) return "";
  const [, y, m, d] = match;
  return exists(Number(y), Number(m), Number(d)) ? `${d}/${m}/${y}` : "";
}

/** "05/11/2026" → "2026-11-05". `null` se incompleta ou inexistente (31/02, por exemplo). */
export function brToIso(br: string): string | null {
  const match = BR.exec(br);
  if (!match) return null;
  const [, d, m, y] = match;
  return exists(Number(y), Number(m), Number(d)) ? `${y}-${m}-${d}` : null;
}

/**
 * Máscara enquanto digita: só dígitos, barras inseridas sozinhas. "05112026" vira
 * "05/11/2026" — ninguém precisa procurar a barra no teclado do celular.
 */
export function maskBr(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Semanas do mês para o calendário, de domingo a sábado. `null` nas casas antes do dia 1
 * e depois do último dia. `month` de 1 a 12.
 */
export function monthGrid(year: number, month: number): (number | null)[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (number | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
