import { supabase } from "../../lib/supabase";
import type { Punch, PunchType } from "../../types/domain";

export interface CreatePunchInput {
  employeeId: string;
  type: PunchType;
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

const LUNCH_BREAK_START_HOUR = 12;
const LUNCH_BREAK_END_HOUR = 13;

/**
 * Garante o intervalo de almoço automático (12:00–13:00) do dia, sem exigir marcação
 * manual. Idempotente: não duplica se o dia já tiver break_start/break_end.
 */
async function ensureLunchBreak(employeeId: string, referenceDate: Date) {
  const startOfDay = new Date(referenceDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const { data: existing, error: fetchError } = await supabase
    .from("effective_punches")
    .select("type")
    .eq("employee_id", employeeId)
    .in("type", ["break_start", "break_end"])
    .gte("occurred_at", startOfDay.toISOString())
    .lt("occurred_at", endOfDay.toISOString());

  if (fetchError) throw fetchError;
  if (existing && existing.length > 0) return;

  const breakStart = new Date(startOfDay);
  breakStart.setHours(LUNCH_BREAK_START_HOUR, 0, 0, 0);
  const breakEnd = new Date(startOfDay);
  breakEnd.setHours(LUNCH_BREAK_END_HOUR, 0, 0, 0);

  const { error: insertError } = await supabase.from("punches").insert([
    { employee_id: employeeId, type: "break_start", occurred_at: breakStart.toISOString(), source: "mobile" },
    { employee_id: employeeId, type: "break_end", occurred_at: breakEnd.toISOString(), source: "mobile" },
  ]);

  if (insertError) throw insertError;
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

  if (input.type === "clock_in") {
    await ensureLunchBreak(input.employeeId, occurredAt);
  }

  return data as unknown as Punch;
}

export async function fetchPunchesForRange(employeeId: string, fromIso: string, toIso: string): Promise<Punch[]> {
  const { data, error } = await supabase
    .from("effective_punches")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("occurred_at", fromIso)
    .lt("occurred_at", toIso)
    .order("occurred_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Punch[];
}

/**
 * Última marcação de entrada/saída do dia (ignora os punches automáticos de intervalo,
 * que têm horário fixo e podem ficar no futuro em relação ao momento real da entrada).
 */
export async function fetchLastPunchToday(employeeId: string): Promise<Punch | null> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("effective_punches")
    .select("*")
    .eq("employee_id", employeeId)
    .in("type", ["clock_in", "clock_out"])
    .gte("occurred_at", startOfDay.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Punch) ?? null;
}

/**
 * O intervalo de almoço (12:00–13:00) é registrado automaticamente (ver ensureLunchBreak
 * em createPunch), então a marcação manual do funcionário alterna só entre entrada/saída.
 */
export function nextPunchType(lastType: PunchType | null): PunchType {
  return lastType === "clock_in" ? "clock_out" : "clock_in";
}
