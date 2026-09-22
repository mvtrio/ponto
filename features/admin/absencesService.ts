import { supabase } from "../../lib/supabase";
import { asError } from "../../lib/supabaseError";
import { fetchEmployees } from "./adminService";
import type { AbsenceKind } from "./absenceInput";

export interface JustifiedAbsence {
  id: string;
  employee_id: string;
  day: string;
  kind: AbsenceKind;
  notes: string | null;
  created_at: string;
}

export interface AbsenceWithName extends JustifiedAbsence {
  employeeName: string;
}

export interface NewAbsenceInput {
  employeeId: string;
  days: string[];
  kind: AbsenceKind;
  notes: string;
  createdBy: string;
}

export async function fetchAbsences(limit = 200): Promise<AbsenceWithName[]> {
  const [{ data, error }, employees] = await Promise.all([
    supabase
      .from("justified_absences")
      .select("*")
      .order("day", { ascending: false })
      .limit(limit),
    fetchEmployees(),
  ]);

  if (error) throw asError(error, "Erro ao carregar os registros de ausência.");

  const nameById = new Map(employees.map((e) => [e.id, e.full_name]));
  return ((data ?? []) as unknown as JustifiedAbsence[]).map((row) => ({
    ...row,
    employeeName: nameById.get(row.employee_id) ?? "Funcionário",
  }));
}

/**
 * Registra o intervalo inteiro de uma vez. `upsert` com ignoreDuplicates porque a
 * restrição é (funcionário, dia): reenviar um período que encosta em dias já
 * registrados deve completar o que falta, não estourar erro de duplicata.
 */
export async function createAbsences(input: NewAbsenceInput): Promise<void> {
  const rows = input.days.map((day) => ({
    employee_id: input.employeeId,
    day,
    kind: input.kind,
    notes: input.notes || null,
    created_by: input.createdBy,
  }));

  const { error } = await supabase
    .from("justified_absences")
    .upsert(rows, { onConflict: "employee_id,day", ignoreDuplicates: true });
  if (error) throw asError(error, "Erro ao registrar o atestado/folga.");
}

export async function deleteAbsence(id: string): Promise<void> {
  const { error } = await supabase.from("justified_absences").delete().eq("id", id);
  if (error) throw asError(error, "Erro ao remover o registro.");
}
