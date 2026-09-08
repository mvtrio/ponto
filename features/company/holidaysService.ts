import { supabase } from "../../lib/supabase";

export interface Holiday {
  day: string;
  name: string;
}

// Feriados nacionais de data fixa: reconhecidos automaticamente todo ano, sem precisar
// cadastrar. Feriados móveis (Carnaval, Páscoa, Corpus Christi) e regionais/municipais
// ficam a cargo do admin em `holidays`.
const FIXED_NATIONAL_HOLIDAYS: { month: number; date: number; name: string }[] = [
  { month: 1, date: 1, name: "Confraternização Universal" },
  { month: 4, date: 21, name: "Tiradentes" },
  { month: 5, date: 1, name: "Dia do Trabalho" },
  { month: 9, date: 7, name: "Independência do Brasil" },
  { month: 10, date: 12, name: "Nossa Senhora Aparecida" },
  { month: 11, date: 2, name: "Finados" },
  { month: 11, date: 15, name: "Proclamação da República" },
  { month: 12, date: 25, name: "Natal" },
];

function toIsoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fixedHolidaysInRange(fromDate: string, toDate: string): Holiday[] {
  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  const holidays: Holiday[] = [];
  for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
    for (const h of FIXED_NATIONAL_HOLIDAYS) {
      const d = new Date(year, h.month - 1, h.date);
      if (d >= start && d <= end) holidays.push({ day: toIsoDay(d), name: h.name });
    }
  }
  return holidays;
}

// Feriados no período: fixos (calculados) + cadastrados pelo admin, mesclados por data
// (um cadastrado pode renomear/substituir um fixo na mesma data).
export async function fetchHolidays(fromDate: string, toDate: string): Promise<Holiday[]> {
  const { data, error } = await supabase.from("holidays").select("day, name").gte("day", fromDate).lte("day", toDate);
  if (error) throw error;

  const byDay = new Map<string, Holiday>();
  for (const h of fixedHolidaysInRange(fromDate, toDate)) byDay.set(h.day, h);
  for (const h of (data ?? []) as Holiday[]) byDay.set(h.day, h);
  return Array.from(byDay.values());
}

export async function fetchCustomHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase.from("holidays").select("day, name").order("day", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Holiday[];
}

export async function addHoliday(day: string, name: string): Promise<void> {
  const { error } = await supabase.from("holidays").insert({ day, name });
  if (error) throw error;
}

export async function deleteHoliday(day: string): Promise<void> {
  const { error } = await supabase.from("holidays").delete().eq("day", day);
  if (error) throw error;
}
