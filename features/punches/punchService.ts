import { appDayRange, appToday } from "../../lib/appDate";
export { nextPunchType } from "./punchRules";
import { supabase } from "../../lib/supabase";
import type { ActivePunchType, Punch, PunchType } from "../../types/domain";

/** Só entrada e saída são consideradas; intervalos antigos ficam de fora. */
const ACTIVE_TYPES: ActivePunchType[] = ["clock_in", "clock_out"];

export interface CreatePunchInput {
  employeeId: string;
  type: ActivePunchType;
  latitude: number | null;
  longitude: number | null;
  locationAccuracyM: number | null;
  photoUri: string | null;
  source: "mobile" | "web";
}

function buildPhotoPath(employeeId: string, type: PunchType, occurredAt: Date) {
  const yyyy = occurredAt.getFullYear();
  const mm = String(occurredAt.getMonth() + 1).padStart(2, "0");
  const dd = String(occurredAt.getDate()).padStart(2, "0");
  return `${employeeId}/${yyyy}/${mm}/${dd}/${type}_${occurredAt.getTime()}.jpg`;
}

async function uploadPhoto(employeeId: string, type: PunchType, occurredAt: Date, photoUri: string) {
  const path = buildPhotoPath(employeeId, type, occurredAt);
  const response = await fetch(photoUri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage.from("punch-photos").upload(path, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function createPunch(input: CreatePunchInput): Promise<Punch> {
  const occurredAt = new Date();
  let photoPath: string | null = null;

  if (input.photoUri) {
    photoPath = await uploadPhoto(input.employeeId, input.type, occurredAt, input.photoUri);
  }

  const { data, error } = await supabase
    .from("punches")
    .insert({
      employee_id: input.employeeId,
      type: input.type,
      occurred_at: occurredAt.toISOString(),
      latitude: input.latitude,
      longitude: input.longitude,
      location_accuracy_m: input.locationAccuracyM,
      photo_path: photoPath,
      source: input.source,
    })
    .select("*")
    .single();

  if (error) {
    // 23505 = violação do índice punches_one_per_type_per_day: já existe uma marcação
    // desse tipo no dia. A tela já bloqueia isso, mas o banco é a garantia real.
    if (error.code === "23505") {
      throw new Error(
        input.type === "clock_in"
          ? "Você já registrou a entrada de hoje."
          : "Você já registrou a saída de hoje."
      );
    }
    throw error;
  }

  return data as unknown as Punch;
}

/**
 * Marcações do período para exibição, com o status de cada uma — inclui pendentes e
 * rejeitadas. Lê de `punches` e não de `effective_punches` (que só traz aprovadas)
 * justamente para a tela poder mostrar o que ainda não conta e o que foi recusado.
 *
 * Rejeitada aparecendo é intencional: sumir em silêncio é pior que um aviso, ainda mais
 * para quem depende do banco de horas. Quem decide ignorá-las é cada consumidor —
 * `nextPunchType`, por exemplo, as descarta para liberar nova marcação.
 */
export async function fetchPunchesForRange(employeeId: string, fromIso: string, toIso: string): Promise<Punch[]> {
  const { data, error } = await supabase
    .from("punches")
    .select("*")
    .eq("employee_id", employeeId)
    .is("superseded_by", null)
    .in("type", ACTIVE_TYPES)
    .gte("occurred_at", fromIso)
    .lt("occurred_at", toIso)
    .order("occurred_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Punch[];
}

/** Marcações pendentes de aprovação, de todos os funcionários (uso do admin). */
export async function fetchPendingPunches(limit = 100): Promise<Punch[]> {
  const { data, error } = await supabase
    .from("punches")
    .select("*")
    .eq("approval_status", "pending")
    .is("superseded_by", null)
    .order("occurred_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as Punch[];
}

export async function reviewPunch(punchId: string, approve: boolean): Promise<Punch> {
  const { data, error } = await supabase.rpc("review_punch", {
    p_punch_id: punchId,
    p_approve: approve,
  });
  if (error) throw error;
  return data as unknown as Punch;
}

/** Marcações de entrada/saída de hoje, em ordem cronológica (dia no fuso do sistema). */
export async function fetchTodayPunches(employeeId: string): Promise<Punch[]> {
  const { fromIso, toIso } = appDayRange(appToday());
  return fetchPunchesForRange(employeeId, fromIso, toIso);
}

