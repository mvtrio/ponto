/**
 * Conversão entre os campos de texto do formulário (AAAA-MM-DD e HH:MM) e o timestamp
 * ISO gravado em `punches.occurred_at`. Tudo no fuso do sistema — ver lib/appDate.
 */

import { appDate, appTime, appToday, startOfAppDay } from "../../lib/appDate";

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  // Rejeita datas inexistentes (ex.: 2026-02-31, que o Date "corrige" para março).
  return parsed.toISOString().slice(0, 10) === value;
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** Monta o ISO a partir da data e hora no fuso do sistema. */
export function toIso(date: string, time: string): string {
  const [hh, mm] = time.split(":").map(Number);
  const startOfDay = new Date(startOfAppDay(date));
  return new Date(startOfDay.getTime() + (hh * 60 + mm) * 60_000).toISOString();
}

export function isoToDate(iso: string): string {
  return appDate(iso);
}

export function isoToTime(iso: string): string {
  return appTime(iso);
}

export function formatDateTime(iso: string): string {
  return `${isoToDate(iso).split("-").reverse().join("/")} às ${isoToTime(iso)}`;
}

export function todayIsoDate(): string {
  return appToday();
}
