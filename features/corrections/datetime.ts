/**
 * Conversão entre os campos de texto do formulário (AAAA-MM-DD e HH:MM, no fuso local)
 * e o timestamp ISO gravado em `punches.occurred_at`.
 */

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  // Rejeita datas inexistentes (ex.: 2026-02-31, que o Date "corrige" para março).
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** Monta o ISO a partir da data e hora locais digitadas. */
export function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function isoToDate(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function isoToTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDateTime(iso: string): string {
  return `${isoToDate(iso).split("-").reverse().join("/")} às ${isoToTime(iso)}`;
}

export function todayIsoDate(): string {
  return isoToDate(new Date().toISOString());
}
