/**
 * Conversão dos campos "horas" e "minutos" do formulário para o total em minutos.
 *
 * Fica separado da tela porque é onde um erro passa despercebido: 1h30 lançado como 90
 * ou como 130 minutos são coisas diferentes, e o número vai direto para o banco de horas
 * do funcionário.
 */
export type AdjustmentKind = "credit" | "debit";

export interface ParsedAdjustment {
  minutes: number;
  error: string | null;
}

export function parseAdjustmentMinutes(
  horas: string,
  minutos: string,
  kind: AdjustmentKind
): ParsedAdjustment {
  const h = horas.trim() === "" ? 0 : Number(horas.trim());
  const m = minutos.trim() === "" ? 0 : Number(minutos.trim());

  if (!Number.isInteger(h) || h < 0) return { minutes: 0, error: "Horas inválidas." };
  if (!Number.isInteger(m) || m < 0) return { minutes: 0, error: "Minutos inválidos." };
  if (m > 59) return { minutes: 0, error: "Os minutos vão de 0 a 59." };

  const total = h * 60 + m;
  if (total === 0) return { minutes: 0, error: "Informe um valor maior que zero." };

  return { minutes: kind === "debit" ? -total : total, error: null };
}
