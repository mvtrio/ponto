import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../lib/theme";
import { appDate, appTime } from "../../lib/appDate";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

interface Props {
  /** Momento escolhido para a marcação. */
  value: Date;
  onChange: (next: Date) => void;
  /** true quando o valor está acompanhando o relógio (nada foi ajustado ainda). */
  isNow: boolean;
  onResetToNow: () => void;
}

function Stepper({
  label,
  onDecrease,
  onIncrease,
  disabledIncrease,
}: {
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  disabledIncrease?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onDecrease} style={styles.stepButton} accessibilityLabel={`Diminuir ${label}`}>
        <Ionicons name="remove" size={28} color={colors.text} />
      </Pressable>
      <Text style={styles.stepLabel}>{label}</Text>
      <Pressable
        onPress={onIncrease}
        disabled={disabledIncrease}
        style={[styles.stepButton, disabledIncrease && styles.stepButtonDisabled]}
        accessibilityLabel={`Aumentar ${label}`}
      >
        <Ionicons name="add" size={28} color={disabledIncrease ? colors.textFaint : colors.text} />
      </Pressable>
    </View>
  );
}

/**
 * Data e hora da marcação, ajustáveis para frente e para trás — o funcionário pode ter
 * esquecido de bater em outro dia.
 *
 * Enquanto nada é ajustado, o valor acompanha o relógio (`isNow`). O futuro é bloqueado:
 * marcar ponto adiante não corresponde a nada que tenha acontecido.
 */
export function PunchDateTimeSelector({ value, onChange, isNow, onResetToNow }: Props) {
  const day = appDate(value);
  const [y, m, d] = day.split("-");
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay()];

  function shift(minutes: number) {
    const next = new Date(value.getTime() + minutes * 60_000);
    if (next.getTime() > Date.now()) return;
    onChange(next);
  }

  const cannotGoForward = value.getTime() >= Date.now() - 1000;

  return (
    <View style={styles.container}>
      <Text style={styles.dateText}>
        {d}/{m}/{y}
      </Text>
      <Text style={styles.time}>{appTime(value)}</Text>
      <Text style={styles.weekday}>{weekday}</Text>

      <View style={styles.steppers}>
        <Stepper
          label="dia"
          onDecrease={() => shift(-24 * 60)}
          onIncrease={() => shift(24 * 60)}
          disabledIncrease={cannotGoForward}
        />
        <Stepper
          label="hora"
          onDecrease={() => shift(-60)}
          onIncrease={() => shift(60)}
          disabledIncrease={cannotGoForward}
        />
        <Stepper
          label="minuto"
          onDecrease={() => shift(-1)}
          onIncrease={() => shift(1)}
          disabledIncrease={cannotGoForward}
        />
      </View>

      {isNow ? (
        <Text style={styles.hint}>Marcando agora. Use − e + para registrar outro horário.</Text>
      ) : (
        <Pressable onPress={onResetToNow} style={styles.resetButton}>
          <Ionicons name="refresh" size={20} color={colors.accent} />
          <Text style={styles.resetText}>Voltar para agora</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 4, paddingVertical: 8 },
  dateText: { fontSize: 22, fontWeight: "600", color: colors.textMuted },
  time: { fontSize: 56, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  weekday: { fontSize: 16, color: colors.textMuted },
  steppers: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 12 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  stepButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  stepButtonDisabled: { opacity: 0.35 },
  stepLabel: { fontSize: 16, color: colors.textMuted, minWidth: 56, textAlign: "center" },
  hint: { fontSize: 14, color: colors.textFaint, marginTop: 8, textAlign: "center" },
  resetButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  resetText: { fontSize: 16, color: colors.accent, fontWeight: "600" },
});
