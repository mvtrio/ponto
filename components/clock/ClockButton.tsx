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
}

export function ClockButton({ nextType, onPress, loading }: ClockButtonProps) {
  if (!nextType) {
    return <Button label="Ponto do dia concluído" onPress={onPress} loading={false} disabled />;
  }
  return <Button label={LABELS[nextType]} onPress={onPress} loading={loading} />;
}
