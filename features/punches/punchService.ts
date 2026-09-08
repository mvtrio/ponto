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

  if (error) throw error;

  return data as unknown as Punch;
}

/**
 * Marcações vigentes do período para exibição — inclui as pendentes de aprovação, que
 * aparecem nas telas com o status, mas ainda não contam no cálculo de horas. Por isso lê
 * de `punches` e não de `effective_punches` (que só traz as aprovadas). Rejeitadas ficam
 * de fora: para efeito de tela é como se nunca tivessem sido batidas.
 */
export async function fetchPunchesForRange(employeeId: string, fromIso: string, toIso: string): Promise<Punch[]> {
  const { data, error } = await supabase
    .from("punches")
    .select("*")
    .eq("employee_id", employeeId)
    .is("superseded_by", null)
    .neq("approval_status", "rejected")
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

/** Marcações de entrada/saída de hoje, em ordem cronológica. */
export async function fetchTodayPunches(employeeId: string): Promise<Punch[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  return fetchPunchesForRange(employeeId, startOfDay.toISOString(), endOfDay.toISOString());
}

/**
 * A jornada é um único par entrada/saída por dia: depois da saída não há próxima
 * marcação (retorna `null`) e o dia fica encerrado.
 */
export function nextPunchType(todayPunches: Punch[]): ActivePunchType | null {
  const hasClockIn = todayPunches.some((p) => p.type === "clock_in");
  const hasClockOut = todayPunches.some((p) => p.type === "clock_out");

  if (!hasClockIn) return "clock_in";
  if (!hasClockOut) return "clock_out";
  return null;
}
