import { fetchCompanySettings } from "../company/companySettingsService";
import { fetchHolidays } from "../company/holidaysService";
import { fetchPunchesForRange } from "../punches/punchService";
import { fetchDailySummaries } from "./hoursService";
import type { Punch } from "../../types/domain";

export type DayStatus = "ok" | "warning" | "folga" | "holiday";

export interface DetailedDayRow {
  day: string;
  label: string;
  status: DayStatus;
  holidayName?: string;
  entrada1: string | null;
  saida1: string | null;
  entrada2: string | null;
  saida2: string | null;
  entrada3: string | null;
  saida3: string | null;
  balanceMinutes: number | null;
}

const WEEKDAYS = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];
const SLOTS: (keyof Pick<DetailedDayRow, "entrada1" | "saida1" | "entrada2" | "saida2" | "entrada3" | "saida3">)[] = [
  "entrada1",
  "saida1",
  "entrada2",
  "saida2",
  "entrada3",
  "saida3",
];

function formatDayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  const weekday = WEEKDAYS[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${weekday}, ${dd}/${mm}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function enumerateDaysDesc(fromDate: string, toDate: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${toDate}T00:00:00`);
  const end = new Date(`${fromDate}T00:00:00`);
  while (cursor >= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}

/**
 * Lista detalhada dia a dia no período: horários de cada marcação (até 3 pares
 * entrada/saída), status (ok/atenção/folga) e saldo do dia.
 */
export async function fetchDetailedDayRows(
  employeeId: string,
  fromDate: string,
  toDate: string
): Promise<DetailedDayRow[]> {
  const toDateExclusive = new Date(`${toDate}T00:00:00`);
  toDateExclusive.setDate(toDateExclusive.getDate() + 1);

  const [summaries, punches, settings, holidays] = await Promise.all([
    fetchDailySummaries(employeeId, fromDate, toDate),
    fetchPunchesForRange(employeeId, `${fromDate}T00:00:00.000Z`, toDateExclusive.toISOString()),
    fetchCompanySettings(),
    fetchHolidays(fromDate, toDate).catch(() => []),
  ]);

  const summaryByDay = new Map(summaries.map((s) => [s.day, s]));
  const holidayByDay = new Map(holidays.map((h) => [h.day, h.name]));

  const punchesByDay = new Map<string, Punch[]>();
  for (const punch of punches) {
    const day = punch.occurred_at.slice(0, 10);
    const list = punchesByDay.get(day) ?? [];
    list.push(punch);
    punchesByDay.set(day, list);
  }

  return enumerateDaysDesc(fromDate, toDate).map((day) => {
    const dayPunches = (punchesByDay.get(day) ?? []).sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
    const summary = summaryByDay.get(day);
    const weekday = new Date(`${day}T00:00:00`).getDay();
    const isWorkDay = settings.work_week_days.includes(weekday);
    const label = formatDayLabel(day);

    const emptyTimes: Record<(typeof SLOTS)[number], string | null> = {
      entrada1: null,
      saida1: null,
      entrada2: null,
      saida2: null,
      entrada3: null,
      saida3: null,
    };

    const holidayName = holidayByDay.get(day);

    if (dayPunches.length === 0) {
      if (holidayName) {
        return { day, label, status: "holiday" as const, holidayName, ...emptyTimes, balanceMinutes: null };
      }
      if (!isWorkDay) {
        return { day, label, status: "folga" as const, ...emptyTimes, balanceMinutes: null };
      }
      return {
        day,
        label,
        status: "warning" as const,
        ...emptyTimes,
        balanceMinutes: -settings.standard_daily_minutes,
      };
    }

    const times = { ...emptyTimes };
    dayPunches.forEach((punch, i) => {
      if (i < SLOTS.length) times[SLOTS[i]] = formatTime(punch.occurred_at);
    });

    const balanceMinutes = summary?.balance_minutes ?? null;
    const isIncomplete = summary?.is_incomplete ?? true;
    const status: DayStatus = isIncomplete || (balanceMinutes !== null && balanceMinutes < 0) ? "warning" : "ok";

    return { day, label, status, holidayName, ...times, balanceMinutes };
  });
}
