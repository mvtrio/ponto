import { Button } from "../ui/Button";
import type { PunchType } from "../../types/domain";

const LABELS: Record<PunchType, string> = {
  clock_in: "Bater entrada",
  break_start: "Iniciar intervalo",
  break_end: "Encerrar intervalo",
  clock_out: "Bater saída",
};

interface ClockButtonProps {
  nextType: PunchType;
  onPress: () => void;
  loading: boolean;
}

export function ClockButton({ nextType, onPress, loading }: ClockButtonProps) {
  return <Button label={LABELS[nextType]} onPress={onPress} loading={loading} />;
}
