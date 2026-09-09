import { Button } from "../ui/Button";
import type { ActivePunchType } from "../../types/domain";

const LABELS: Record<ActivePunchType, string> = {
  clock_in: "Bater entrada",
  clock_out: "Bater saída",
};

interface ClockButtonProps {
  /** `null` quando entrada e saída do dia já foram batidas. */
  nextType: ActivePunchType | null;
  onPress: () => void;
  loading: boolean;
  /**
   * Texto do botão desabilitado quando `nextType` é null por motivo que não seja o dia
   * fechado — carregando ou falha. Sem isso o botão afirmaria "Ponto do dia concluído"
   * sem saber se é verdade.
   */
  blockedLabel?: string;
}

export function ClockButton({ nextType, onPress, loading, blockedLabel }: ClockButtonProps) {
  if (!nextType) {
    return <Button label={blockedLabel ?? "Ponto do dia concluído"} onPress={onPress} loading={false} disabled />;
  }
  return <Button label={LABELS[nextType]} onPress={onPress} loading={loading} />;
}
