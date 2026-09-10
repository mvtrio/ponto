import { fetchCompanySettings } from "../company/companySettingsService";
import { fetchHolidays } from "../company/holidaysService";
import { fetchPunchesForRange } from "../punches/punchService";
import { fetchDailySummaries } from "./hoursService";
import { addDays, appDate, appTime, appWeekday, startOfAppDay } from "../../lib/appDate";
import type { Punch } from "../../types/domain";

export type DayStatus = "ok" | "warning" | "folga" | "holiday" | "absent";

export interface DetailedDayRow {
  day: string;
  label: string;
  status: DayStatus;
  holidayName?: string;
  entrada: string | null;
  saida: string | null;
  balanceMinutes: number | null;
  /** Dia com marcações ainda não aprovadas — por isso não entra no saldo. */
  hasPending: boolean;
  /** Dia com marcação recusada pelo administrador. */
  hasRejected: boolean;
}

const WEEKDAYS = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];

function formatDayLabel(day: string): string {
  const [, mm, dd] = day.split("-");
  return `${WEEKDAYS[appWeekday(day)]}, ${dd}/${mm}`;
}

function enumerateDaysDesc(fromDate: string, toDate: string): string[] {
  const days: string[] = [];
  let cursor = toDate;
  while (cursor >= fromDate) {
    days.push(cursor);
    cursor = addDays(cursor, -1);
  }
  return days;
}

/**
 * Lista detalhada dia a dia no período: o par entrada/saída do dia, status
 * (ok/atenção/folga/feriado) e saldo do dia.
 */
export async function fetchDetailedDayRows(
  employeeId: string,
  fromDate: string,
  toDate: string
): Promise<DetailedDayRow[]> {
  const [summaries, punches, settings, holidays] = await Promise.all([
    fetchDailySummaries(employeeId, fromDate, toDate),
    // Limites do dia no fuso do sistema: o dia local não começa à meia-noite UTC.
    fetchPunchesForRange(employeeId, startOfAppDay(fromDate), startOfAppDay(addDays(toDate, 1))),
    fetchCompanySettings(),
    fetchHolidays(fromDate, toDate).catch(() => []),
  ]);

  const summaryByDay = new Map(summaries.map((s) => [s.day, s]));
  const holidayByDay = new Map(holidays.map((h) => [h.day, h.name]));

  const punchesByDay = new Map<string, Punch[]>();
  for (const punch of punches) {
    // appDate e não slice(0, 10): o corte cru pega a data em UTC, jogando uma marcação
    // do fim da tarde para o dia seguinte.
    const day = appDate(punch.occurred_at);
    const list = punchesByDay.get(day) ?? [];
    list.push(punch);
    punchesByDay.set(day, list);
  }

  return enumerateDaysDesc(fromDate, toDate).map((day) => {
    const dayPunches = (punchesByDay.get(day) ?? []).sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
    const summary = summaryByDay.get(day);
    const weekday = appWeekday(day);
    const isWorkDay = settings.work_week_days.includes(weekday);
    const label = formatDayLabel(day);

    const emptyTimes = { entrada: null, saida: null, hasPending: false, hasRejected: false };

    const holidayName = holidayByDay.get(day);

    if (dayPunches.length === 0) {
      if (holidayName) {
        return { day, label, status: "holiday" as const, holidayName, ...emptyTimes, balanceMinutes: null };
      }
      if (!isWorkDay) {
        return { day, label, status: "folga" as const, ...emptyTimes, balanceMinutes: null };
      }
      // Falta: dia útil sem marcação. O saldo negativo vem do daily_summary, que agora
      // gera a linha; o dia corrente ainda não conta e por isso pode não ter resumo.
      return {
        day,
        label,
        status: summary ? ("absent" as const) : ("warning" as const),
        ...emptyTimes,
        balanceMinutes: summary?.balance_minutes ?? null,
      };
    }

    // Rejeitada não vale como marcação: não ocupa a coluna de entrada/saída, só sinaliza.
    const valid = dayPunches.filter((p) => p.approval_status !== "rejected");
    const clockIn = valid.find((p) => p.type === "clock_in");
    const clockOut = valid.find((p) => p.type === "clock_out");
    // Marcação pendente não entra em effective_punches, logo não gera saldo. Sinalizar o
    // dia evita que a tela pareça quebrada: o horário aparece e o saldo fica vazio.
    const hasPending = valid.some((p) => p.approval_status === "pending");
    const hasRejected = dayPunches.some((p) => p.approval_status === "rejected");
    const times = {
      entrada: clockIn ? appTime(clockIn.occurred_at) : null,
      saida: clockOut ? appTime(clockOut.occurred_at) : null,
    };

    const balanceMinutes = summary?.balance_minutes ?? null;
    const isIncomplete = summary?.is_incomplete ?? true;
    const status: DayStatus = isIncomplete || (balanceMinutes !== null && balanceMinutes < 0) ? "warning" : "ok";

    return { day, label, status, holidayName, ...times, balanceMinutes, hasPending, hasRejected };
  });
}
