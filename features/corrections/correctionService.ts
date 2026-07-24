import { supabase } from "../../lib/supabase";
import type { Correction, PunchType } from "../../types/domain";

export interface ProposeCorrectionInput {
  employeeId: string;
  requestedBy: string;
  originalPunchId: string | null;
  proposedType: PunchType;
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

export async function fetchPendingCorrections(): Promise<Correction[]> {
  const { data, error } = await supabase
    .from("corrections")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Correction[];
}

export async function approveCorrection(correctionId: string, approve: boolean): Promise<Correction> {
  const { data, error } = await supabase.rpc("approve_correction", {
    p_correction_id: correctionId,
    p_approve: approve,
  });
  if (error) throw error;
  return data as unknown as Correction;
}
