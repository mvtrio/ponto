import { supabase } from "../../lib/supabase";
import { asError } from "../../lib/supabaseError";
import { fetchEmployees } from "../admin/adminService";
import type { HourBankState } from "./closingMath";

export interface MonthClosing {
  id: string;
  employee_id: string;
  month: string;
  from_day: string;
  to_day: string;
  debit_minutes: number;
  overtime_minutes: number;
  applied_minutes: number;
  carry_debit_minutes: number;
  carry_credit_minutes: number;
  closed_at: string;
}

export interface ClosingWithName extends MonthClosing {
  employeeName: string;
}

/**
 * Débito e extras acumulados, separados.
 *
 * `hour_bank_state` devolve uma linha só, mas o PostgREST trata função que retorna
 * TABLE como coleção — daí o array.
 */
export async function fetchHourBankState(employeeId: string, asOf?: string): Promise<HourBankState> {
  const { data, error } = await supabase.rpc("hour_bank_state", {
    p_employee_id: employeeId,
    // Omitido, o Postgres usa current_date. A prévia do fechamento precisa apurar na
    // data em que o mês termina, não hoje.
    ...(asOf ? { p_as_of: asOf } : {}),
  });
  if (error) throw asError(error, "Erro ao apurar o banco de horas.");

  const row = (Array.isArray(data) ? data[0] : data) as
    | { debit_minutes: number; overtime_minutes: number }
    | undefined;

  // Sem linha não é "zerado", é resposta inesperada: quem chama precisa saber a diferença.
  if (!row) throw new Error("Não foi possível apurar o banco de horas.");

  return { debitMinutes: row.debit_minutes, overtimeMinutes: row.overtime_minutes };
}

export async function fetchClosings(): Promise<ClosingWithName[]> {
  const [{ data, error }, employees] = await Promise.all([
    supabase.from("month_closings").select("*").order("month", { ascending: false }),
    fetchEmployees(),
  ]);

  if (error) throw asError(error, "Erro ao carregar os fechamentos.");

  const nameById = new Map(employees.map((e) => [e.id, e.full_name]));
  return ((data ?? []) as unknown as MonthClosing[]).map((row) => ({
    ...row,
    employeeName: nameById.get(row.employee_id) ?? "Funcionário",
  }));
}

export async function closeMonth(employeeId: string, month: string): Promise<void> {
  const { error } = await supabase.rpc("close_month", {
    p_employee_id: employeeId,
    p_month: month,
  });
  if (error) throw asError(error, "Erro ao fechar o mês.");
}

export async function reopenMonth(closingId: string): Promise<void> {
  const { error } = await supabase.rpc("reopen_month", { p_closing_id: closingId });
  if (error) throw asError(error, "Erro ao reabrir o mês.");
}
