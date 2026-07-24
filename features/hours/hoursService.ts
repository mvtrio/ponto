import { supabase } from "../../lib/supabase";
import type { DailySummary } from "../../types/domain";

export async function fetchDailySummaries(
  employeeId: string,
  fromDate: string,
  toDate: string
): Promise<DailySummary[]> {
  const { data, error } = await supabase
    .from("daily_summary")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("day", fromDate)
    .lte("day", toDate)
    .order("day", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as DailySummary[];
}

export async function fetchHourBankBalance(employeeId: string, asOfDate?: string): Promise<number> {
  const { data, error } = await supabase.rpc("hour_bank_balance", {
    p_employee_id: employeeId,
    p_as_of: asOfDate,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}
