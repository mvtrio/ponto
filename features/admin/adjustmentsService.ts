import { supabase } from "../../lib/supabase";
import { asError } from "../../lib/supabaseError";
import { fetchEmployees } from "./adminService";

export interface BalanceAdjustment {
  id: string;
  employee_id: string;
  day: string;
  minutes: number;
  reason: string;
  created_at: string;
}

export interface AdjustmentWithName extends BalanceAdjustment {
  employeeName: string;
}

export interface NewAdjustmentInput {
  employeeId: string;
  day: string;
  minutes: number;
  reason: string;
  createdBy: string;
}

/**
 * Lançamentos manuais, do mais recente para o mais antigo, com o nome já resolvido.
 * O nome vem de uma segunda consulta em vez de join embutido pelo mesmo motivo das
 * correções: a tabela referencia `profiles` duas vezes (funcionário e quem lançou).
 */
export async function fetchAdjustments(limit = 100): Promise<AdjustmentWithName[]> {
  const [{ data, error }, employees] = await Promise.all([
    supabase
      .from("balance_adjustments")
      .select("*")
      .order("day", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
    fetchEmployees(),
  ]);

  if (error) throw asError(error, "Erro ao carregar os lançamentos.");

  const nameById = new Map(employees.map((e) => [e.id, e.full_name]));
  return ((data ?? []) as unknown as BalanceAdjustment[]).map((row) => ({
    ...row,
    employeeName: nameById.get(row.employee_id) ?? "Funcionário",
  }));
}

export async function createAdjustment(input: NewAdjustmentInput): Promise<void> {
  const { error } = await supabase.from("balance_adjustments").insert({
    employee_id: input.employeeId,
    day: input.day,
    minutes: input.minutes,
    reason: input.reason,
    created_by: input.createdBy,
  });
  if (error) throw asError(error, "Erro ao registrar o lançamento.");
}

export async function deleteAdjustment(id: string): Promise<void> {
  const { error } = await supabase.from("balance_adjustments").delete().eq("id", id);
  if (error) throw asError(error, "Erro ao remover o lançamento.");
}
