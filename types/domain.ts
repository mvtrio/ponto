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

/** Marcação nasce `pending` e só entra no cálculo de horas depois de aprovada. */
export type PunchApprovalStatus = "pending" | "approved" | "rejected";

export const PUNCH_APPROVAL_LABELS: Record<PunchApprovalStatus, string> = {
  pending: "Aguardando aprovação",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

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
  approval_status: PunchApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
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

export type AbsenceKind = "atestado" | "folga";

export interface DailySummary {
  employee_id: string;
  day: string;
  worked_minutes: number;
  is_incomplete: boolean;
  standard_daily_minutes: number;
  balance_minutes: number;
  /** Ausência justificada registrada pelo admin: o dia não é cobrado, mas aparece. */
  absence_kind: AbsenceKind | null;
}

export function formatMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `${sign}${hours}h${minutes.toString().padStart(2, "0")}`;
}

/**
 * O mesmo total de minutos lido como dias de trabalho: "2 dias e 3h00".
 *
 * "19h00 de débito" não diz muita coisa — ninguém deve horas, deve expediente. Dividir
 * pela jornada padrão (que já é líquida, sem o intervalo) devolve o número na unidade em
 * que a dívida vai ser paga: dias de trabalho.
 *
 * Retorna `null` quando não há o que converter — nada a dever, ou jornada não carregada.
 * Abaixo de um dia o texto não repete as horas que estão logo acima: diz que é menos de
 * um dia e pronto.
 */
export function formatMinutesAsWorkDays(
  totalMinutes: number,
  standardDailyMinutes: number
): string | null {
  if (totalMinutes <= 0 || standardDailyMinutes <= 0) return null;

  const days = Math.floor(totalMinutes / standardDailyMinutes);
  const rest = totalMinutes % standardDailyMinutes;

  if (days === 0) return "menos de 1 dia";

  const label = days === 1 ? "1 dia" : `${days} dias`;
  return rest === 0 ? label : `${label} e ${formatMinutes(rest)}`;
}
