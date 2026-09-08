import { supabase } from "../../lib/supabase";
import type { ActivePunchType, Correction, CorrectionStatus, Profile, Punch } from "../../types/domain";

export interface ProposeCorrectionInput {
  employeeId: string;
  requestedBy: string;
  originalPunchId: string | null;
  proposedType: ActivePunchType;
  proposedOccurredAt: string;
  reason: string;
}

export async function proposeCorrection(input: ProposeCorrectionInput): Promise<Correction> {
  const { data, error } = await supabase
    .from("corrections")
    .insert({
      employee_id: input.employeeId,
      requested_by: input.requestedBy,
      original_punch_id: input.originalPunchId,
      proposed_type: input.proposedType,
      proposed_occurred_at: input.proposedOccurredAt,
      reason: input.reason,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as Correction;
}

/**
 * Correção com os nomes já resolvidos e o horário da marcação original, para a tela do
 * admin não precisar exibir UUIDs. Os nomes são resolvidos no cliente em vez de por join
 * embutido porque `corrections` referencia `profiles` duas vezes (funcionário e solicitante),
 * o que tornaria a query dependente do nome exato das constraints.
 */
export interface DetailedCorrection extends Correction {
  employeeName: string;
  requesterName: string;
  originalOccurredAt: string | null;
}

async function decorateCorrections(corrections: Correction[]): Promise<DetailedCorrection[]> {
  if (corrections.length === 0) return [];

  const profileIds = Array.from(
    new Set(corrections.flatMap((c) => [c.employee_id, c.requested_by]))
  );
  const punchIds = Array.from(
    new Set(corrections.map((c) => c.original_punch_id).filter((id): id is string => !!id))
  );

  const [{ data: profiles }, punchesResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", profileIds),
    punchIds.length
      ? supabase.from("punches").select("id, occurred_at").in("id", punchIds)
      : Promise.resolve({ data: [] as Pick<Punch, "id" | "occurred_at">[] }),
  ]);

  const nameById = new Map((profiles ?? []).map((p: Pick<Profile, "id" | "full_name">) => [p.id, p.full_name]));
  const punchAtById = new Map(
    ((punchesResult.data ?? []) as Pick<Punch, "id" | "occurred_at">[]).map((p) => [p.id, p.occurred_at])
  );

  return corrections.map((c) => ({
    ...c,
    employeeName: nameById.get(c.employee_id) ?? "Funcionário",
    requesterName: nameById.get(c.requested_by) ?? "—",
    originalOccurredAt: c.original_punch_id ? punchAtById.get(c.original_punch_id) ?? null : null,
  }));
}

export async function fetchCorrectionsByStatus(
  status: CorrectionStatus,
  limit = 50
): Promise<DetailedCorrection[]> {
  const { data, error } = await supabase
    .from("corrections")
    .select("*")
    .eq("status", status)
    // Pendentes: mais antigas primeiro (fila). Revisadas: mais recentes primeiro (histórico).
    .order(status === "pending" ? "created_at" : "reviewed_at", { ascending: status === "pending" })
    .limit(limit);

  if (error) throw error;
  return decorateCorrections((data ?? []) as unknown as Correction[]);
}

/** Histórico das correções já revisadas (aprovadas e rejeitadas), mais recentes primeiro. */
export async function fetchReviewedCorrections(limit = 20): Promise<DetailedCorrection[]> {
  const { data, error } = await supabase
    .from("corrections")
    .select("*")
    .neq("status", "pending")
    .order("reviewed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return decorateCorrections((data ?? []) as unknown as Correction[]);
}

/**
 * Ajusta a proposta antes de aprovar: o admin não fica preso ao horário que o funcionário
 * pediu, podendo corrigir para o valor correto. Só faz sentido enquanto está pendente.
 */
export async function updateCorrectionProposal(
  correctionId: string,
  proposedType: ActivePunchType,
  proposedOccurredAt: string
): Promise<Correction> {
  const { data, error } = await supabase
    .from("corrections")
    .update({ proposed_type: proposedType, proposed_occurred_at: proposedOccurredAt })
    .eq("id", correctionId)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error) throw error;
  return data as unknown as Correction;
}

export async function approveCorrection(correctionId: string, approve: boolean): Promise<Correction> {
  const { data, error } = await supabase.rpc("approve_correction", {
    p_correction_id: correctionId,
    p_approve: approve,
  });
  if (error) throw error;
  return data as unknown as Correction;
}

/**
 * Correção lançada diretamente pelo admin (estorno), sem solicitação prévia do funcionário:
 * cria a proposta em nome dele e já aprova, gerando a marcação corrigida.
 */
export async function applyAdminCorrection(input: ProposeCorrectionInput): Promise<Correction> {
  const correction = await proposeCorrection(input);
  return approveCorrection(correction.id, true);
}
