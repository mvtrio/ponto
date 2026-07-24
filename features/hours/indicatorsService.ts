import type { ChartPoint } from "../../components/charts/MiniLineChart";
import { fetchDailySummaries, fetchHourBankBalance } from "./hoursService";

export type Granularity = "day" | "week" | "month";

const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function parseDay(day: string): Date {
  return new Date(`${day}T00:00:00`);
}

function formatDayLabel(day: string): string {
  const d = parseDay(day);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function startOfWeek(day: string): Date {
  const d = parseDay(day);
  const weekday = d.getDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

function weekKey(day: string): string {
  return startOfWeek(day).toISOString().slice(0, 10);
}

function weekLabel(day: string): string {
  const monday = startOfWeek(day);
  return `${monday.getDate()}/${monday.getMonth() + 1}`;
}

function monthKey(day: string): string {
  return day.slice(0, 7);
}

function monthLabel(day: string): string {
  const d = parseDay(day);
  return MONTH_LABELS[d.getMonth()];
}

function bucketOf(day: string, granularity: Granularity): { key: string; label: string } {
  if (granularity === "week") return { key: weekKey(day), label: weekLabel(day) };
  if (granularity === "month") return { key: monthKey(day), label: monthLabel(day) };
  return { key: day, label: formatDayLabel(day) };
}

function previousDayIso(day: string): string {
  const d = parseDay(day);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Série do saldo acumulado do banco de horas ao longo do período, na granularidade pedida.
 * Para semana/mês, mantém o último valor acumulado de cada bucket (o saldo "no fim" daquele
 * período), em vez de somar — o saldo já é cumulativo por natureza.
 */
export async function fetchBalanceSeries(
  employeeId: string,
  fromDate: string,
  toDate: string,
  granularity: Granularity
): Promise<ChartPoint[]> {
  const daily = await fetchDailySummaries(employeeId, fromDate, toDate);
  const sorted = [...daily].sort((a, b) => a.day.localeCompare(b.day));
  const base = await fetchHourBankBalance(employeeId, previousDayIso(fromDate));

  let cumulative = base;
  const buckets = new Map<string, ChartPoint>();
  for (const row of sorted) {
    cumulative += row.balance_minutes;
    const { key, label } = bucketOf(row.day, granularity);
    buckets.set(key, { label, value: cumulative });
  }

  return Array.from(buckets.values());
}

/**
 * Série de horas extras (apenas o saldo positivo de cada dia, dias de déficit contam 0),
 * somada por bucket na granularidade pedida.
 */
export async function fetchOvertimeSeries(
  employeeId: string,
  fromDate: string,
  toDate: string,
  granularity: Granularity
): Promise<ChartPoint[]> {
  const daily = await fetchDailySummaries(employeeId, fromDate, toDate);
  const sorted = [...daily].sort((a, b) => a.day.localeCompare(b.day));

  const buckets = new Map<string, ChartPoint>();
  for (const row of sorted) {
    const { key, label } = bucketOf(row.day, granularity);
    const extra = Math.max(row.balance_minutes, 0);
    const existing = buckets.get(key);
    buckets.set(key, { label, value: (existing?.value ?? 0) + extra });
  }

  return Array.from(buckets.values());
}

export async function fetchPeriodOvertimeTotal(employeeId: string, fromDate: string, toDate: string): Promise<number> {
  const daily = await fetchDailySummaries(employeeId, fromDate, toDate);
  return daily.reduce((sum, row) => sum + Math.max(row.balance_minutes, 0), 0);
}
