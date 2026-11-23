import { supabase } from "../../lib/supabase";
import { nationalHolidaysInRange } from "./nationalHolidays";

export interface Holiday {
  day: string;
  name: string;
}

// Feriados no período: nacionais (calculados em nationalHolidays) + cadastrados pelo
// admin, mesclados por data (um cadastrado pode renomear/substituir um nacional na mesma
// data). Regionais, municipais e os de ponto facultativo (Carnaval, Corpus Christi) só
// existem se o admin cadastrar.
export async function fetchHolidays(fromDate: string, toDate: string): Promise<Holiday[]> {
  const { data, error } = await supabase.from("holidays").select("day, name").gte("day", fromDate).lte("day", toDate);
  if (error) throw error;

  const byDay = new Map<string, Holiday>();
  for (const h of nationalHolidaysInRange(fromDate, toDate)) byDay.set(h.day, h);
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
