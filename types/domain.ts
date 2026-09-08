export type Role = "employee" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  employee_code: string | null;
  active: boolean;
  created_at: string;
}

/**
 * O funcionário bate apenas entrada e saída. `break_start`/`break_end` são legado:
 * existem em registros antigos, mas não são mais criados nem considerados no cálculo
 * (o intervalo virou o desconto fixo `CompanySettings.break_minutes`).
 */
export type PunchType = "clock_in" | "clock_out" | "break_start" | "break_end";

/** Tipos que o funcionário efetivamente marca hoje. */
export type ActivePunchType = Extract<PunchType, "clock_in" | "clock_out">;

/** Rótulos em português; inclui os tipos legados para exibir marcações antigas. */
export const PUNCH_TYPE_LABELS: Record<PunchType, string> = {
  clock_in: "Entrada",
  clock_out: "Saída",
  break_start: "Início do intervalo",
  break_end: "Fim do intervalo",
};

export type PunchSource = "mobile" | "web" | "correction";

export interface Punch {
  id: string;
  employee_id: string;
  type: PunchType;
  occurred_at: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  photo_path: string | null;
  source: PunchSource;
  is_corrected: boolean;
  superseded_by: string | null;
}

export type CorrectionStatus = "pending" | "approved" | "rejected";

export interface Correction {
  id: string;
  original_punch_id: string | null;
  employee_id: string;
  proposed_type: PunchType;
  proposed_occurred_at: string;
  reason: string;
  requested_by: string;
  status: CorrectionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resulting_punch_id: string | null;
  created_at: string;
}

export interface CompanySettings {
  id: 1;
  standard_daily_minutes: number;
  /** Intervalo descontado automaticamente de cada dia fechado (não é marcado pelo funcionário). */
  break_minutes: number;
  tolerance_minutes: number;
  work_week_days: number[];
  updated_at: string;
}

export interface DailySummary {
  employee_id: string;
  day: string;
  worked_minutes: number;
  is_incomplete: boolean;
  standard_daily_minutes: number;
  balance_minutes: number;
}

export function formatMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `${sign}${hours}h${minutes.toString().padStart(2, "0")}`;
}
