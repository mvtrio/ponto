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

export async function fetchLastPunchToday(employeeId: string): Promise<Punch | null> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("effective_punches")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("occurred_at", startOfDay.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Punch) ?? null;
}

export function nextPunchType(lastType: PunchType | null): PunchType {
  switch (lastType) {
    case null:
      return "clock_in";
    case "clock_in":
      return "break_start";
    case "break_start":
      return "break_end";
    case "break_end":
      return "clock_out";
    case "clock_out":
      return "clock_in";
  }
}
